// Синхронизация журнала с сервером: отправить свои события из очереди, забрать чужие с курсора,
// живые обновления через подписку. Офлайн — просто ждём: очередь лежит в IndexedDB.
// Сервер скрыт за интерфейсом Remote — логика тестируется без сети (tests/sync.test.ts).
import type { ProfileEvent } from '../core/state.ts'
import { isEvent, type GameStore } from './store.ts'

/** Событие с сервера: плюс время записи на сервере (курсор подкачки). */
export interface RemoteEvent extends ProfileEvent {
  created: string
}

/** Ошибки сервера, разложенные по смыслу. */
export class RemoteError extends Error {
  /** busy — 429, сервер просит подождать. */
  kind: 'offline' | 'auth' | 'rejected' | 'busy' | 'other'
  constructor(kind: RemoteError['kind'], message: string) {
    super(message)
    this.kind = kind
  }
}

export interface Remote {
  /** Id пользователя, если вход выполнен (токен может быть просрочен — это покажет refresh). */
  userId(): string | null
  userEmail(): string | null
  login(email: string, password: string): Promise<void>
  logout(): void
  /** Продлить токен. Бросает RemoteError('auth'), если вход больше не действителен. */
  refresh(): Promise<void>
  /** 'dup' — такое событие на сервере уже есть (отправили раньше, ответ потерялся). */
  push(e: ProfileEvent): Promise<'ok' | 'dup'>
  /** Страница событий, записанных на сервере не раньше since (по возрастанию created). */
  pull(since: string | null, page: number, perPage: number): Promise<RemoteEvent[]>
  /** Живые события; onReconnect — подписка восстановилась (что-то могли пропустить). */
  subscribe(onEvent: (e: RemoteEvent) => void, onReconnect: () => void): Promise<() => void>
}

export type SyncState = 'off' | 'signedout' | 'syncing' | 'ok' | 'offline' | 'error'

export interface SyncStatus {
  state: SyncState
  email: string | null
  /** Сколько своих событий ещё не на сервере. */
  pending: number
  /** Время последней удачной синхронизации. */
  last: number | null
  error: string | null
}

const PER_PAGE = 500
const PUSH_PARALLEL = 6
/** Перекрытие курсора: запись, начатая чуть раньше, могла закончиться после нашего чтения. Дубли отсекает merge. */
const OVERLAP_MS = 15_000

export const cursorKey = (user: string) => `sync.cursor.${user}`

/** "2026-11-24 10:00:00.123Z" (формат дат PocketBase) минус ms. */
export function rewind(created: string, ms: number): string {
  const t = Date.parse(created.replace(' ', 'T'))
  if (!Number.isFinite(t)) return created
  return new Date(t - ms).toISOString().replace('T', ' ')
}

export interface SyncOptions {
  clock?: () => number
  /** Задержка отправки после своего действия: пачка шагов уйдёт одним заходом. */
  debounceMs?: number
  /** Пауза при 429 (растёт с каждой попыткой). */
  busyMs?: number
}

export class Sync {
  status: SyncStatus
  private store: GameStore
  private remote: Remote | null
  private listeners = new Set<() => void>()
  private running: Promise<void> | null = null
  private again = false
  private unsub: (() => void) | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private clock: () => number
  private debounceMs: number
  private busyMs: number
  private closed = false
  private listening = false

  constructor(store: GameStore, remote: Remote | null, o: SyncOptions = {}) {
    this.store = store
    this.remote = remote
    this.clock = o.clock ?? Date.now
    this.debounceMs = o.debounceMs ?? 1500
    this.busyMs = o.busyMs ?? 1000
    this.status = {
      state: remote ? (remote.userId() ? 'syncing' : 'signedout') : 'off',
      email: remote?.userEmail() ?? null,
      pending: 0,
      last: null,
      error: null,
    }
    store.onLocal = () => this.soon()
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getStatus = () => this.status

  private set(p: Partial<SyncStatus>) {
    this.status = { ...this.status, ...p }
    for (const fn of this.listeners) fn()
  }

  /** Запуск: продлить вход, подписаться, синхронизироваться. */
  async start(): Promise<void> {
    const r = this.remote
    if (!r) return
    await this.countPending()
    if (!r.userId()) return this.set({ state: 'signedout' })
    try {
      await r.refresh()
    } catch (e) {
      if (e instanceof RemoteError && e.kind === 'auth') return this.signedOut('Войдите снова: вход истёк')
      // Сервер недоступен — работаем со старым токеном, попробуем позже.
    }
    this.listen()
    await this.syncNow()
  }

  async login(email: string, password: string): Promise<void> {
    const r = this.remote
    if (!r) throw new Error('Сервер не настроен')
    try {
      await r.login(email, password)
    } catch (e) {
      throw new Error(explain(e, 'Неверная почта или пароль'), { cause: e })
    }
    this.set({ email: r.userEmail(), error: null, state: 'syncing' })
    this.listen()
    await this.syncNow()
  }

  logout() {
    this.unsub?.()
    this.unsub = null
    this.remote?.logout()
    this.set({ state: 'signedout', email: null, error: null, last: null })
  }

  private signedOut(error: string) {
    this.unsub?.()
    this.unsub = null
    this.remote?.logout()
    this.set({ state: 'signedout', email: null, error })
  }

  /**
   * Живая подписка — в фоне: без сети подключение висит долго, синхронизацию оно ждать не должно.
   * Не подключилось — SDK переподключится сам; пропущенное догонит подкачка по таймеру и фокусу.
   */
  private listen() {
    const r = this.remote
    if (!r || this.unsub || this.listening) return
    this.listening = true
    r.subscribe(
      (e) => {
        if (isEvent(e)) this.store.merge([strip(e)], true)
      },
      () => this.soon(0),
    )
      .then((off) => {
        // За время подключения успели выйти или закрыться — сразу отписываемся.
        if (this.closed || !r.userId()) off()
        else this.unsub = off
      })
      .catch(() => {})
      .finally(() => (this.listening = false))
  }

  /** Синхронизироваться в ближайшее время (несколько действий подряд — один заход). */
  soon(ms = this.debounceMs) {
    if (this.closed || !this.remote?.userId()) return
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      void this.syncNow()
    }, ms)
  }

  /** Одна синхронизация за раз; вызов во время работы — ещё один проход после. */
  syncNow(): Promise<void> {
    if (!this.remote?.userId() || this.closed) return Promise.resolve()
    if (this.running) {
      this.again = true
      return this.running
    }
    this.running = (async () => {
      do {
        this.again = false
        await this.pass()
      } while (this.again && !this.closed)
    })().finally(() => (this.running = null))
    return this.running
  }

  private async countPending() {
    try {
      this.set({ pending: (await this.store.storageRef.loadOutbox()).length })
    } catch {
      /* не критично */
    }
  }

  private async pass() {
    const r = this.remote!
    const user = r.userId()
    if (!user) return
    this.set({ state: 'syncing' })
    try {
      await this.pushAll(r)
      await this.pullAll(r, user)
      this.set({ state: 'ok', last: this.clock(), error: null })
    } catch (e) {
      if (e instanceof RemoteError && e.kind === 'auth') return this.signedOut('Войдите снова: вход истёк')
      if (e instanceof RemoteError && e.kind === 'offline') return this.set({ state: 'offline', error: null })
      this.set({ state: 'error', error: explain(e, 'Ошибка синхронизации') })
    } finally {
      await this.countPending()
    }
  }

  private async pushAll(r: Remote) {
    const st = this.store.storageRef
    const ids = await st.loadOutbox()
    if (!ids.length) return
    const events = this.store.byIds(ids)
    // В очереди id, которого нет в журнале (не дописался на диск) — выкидываем, отправлять нечего.
    const have = new Set(events.map((e) => e.id))
    const lost = ids.filter((id) => !have.has(id))
    if (lost.length) await st.dropOutbox(lost)
    let i = 0
    let rejected = 0
    const worker = async () => {
      while (i < events.length) {
        const e = events[i++]!
        for (let tries = 0; ; tries++) {
          try {
            await r.push(e)
            break
          } catch (err) {
            // Сервер отверг событие насовсем (схема, размер) — не держим очередь вечно, но и не молчим.
            if (err instanceof RemoteError && err.kind === 'rejected') {
              rejected++
              break
            }
            // Лимит частоты: подождать и повторить; долго не отпускает — считаем, что сервер занят.
            if (err instanceof RemoteError && err.kind === 'busy' && tries < 8) {
              await new Promise((ok) => setTimeout(ok, this.busyMs * (tries + 1)))
              continue
            }
            throw err instanceof RemoteError && err.kind === 'busy'
              ? new RemoteError('offline', err.message)
              : err
          }
        }
        await st.dropOutbox([e.id])
      }
    }
    await Promise.all(Array.from({ length: Math.min(PUSH_PARALLEL, events.length) }, worker))
    if (rejected) throw new Error(`Сервер не принял событий: ${rejected}`)
  }

  private async pullAll(r: Remote, user: string) {
    const st = this.store.storageRef
    const key = cursorKey(user)
    const cursor = await st.getKey<string>(key)
    const since = cursor ? rewind(cursor, OVERLAP_MS) : null
    let max = cursor
    for (let page = 1; ; page++) {
      const items = await r.pull(since, page, PER_PAGE)
      const ok = items.filter(isEvent)
      if (ok.length) this.store.merge(ok.map(strip), true)
      for (const it of items) if (!max || it.created > max) max = it.created
      if (items.length < PER_PAGE) break
    }
    if (max && max !== cursor) await st.setKey(key, max)
  }

  close() {
    this.closed = true
    if (this.timer) clearTimeout(this.timer)
    this.unsub?.()
    this.store.onLocal = undefined
  }
}

/** Только поля события — created и прочее серверное в журнал не попадает. */
function strip(e: ProfileEvent): ProfileEvent {
  return { id: e.id, ts: e.ts, dev: e.dev, type: e.type, data: e.data }
}

function explain(e: unknown, fallback: string): string {
  if (e instanceof RemoteError) {
    if (e.kind === 'offline') return 'Сервер недоступен — комп выключен или нет сети'
    if (e.kind === 'auth') return fallback
    return e.message || fallback
  }
  return e instanceof Error && e.message ? e.message : fallback
}
