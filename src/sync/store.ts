// Хранилище игры на устройстве: журнал событий + локальный забег.
// Профиль = свёртка журнала от общего начального состояния, поэтому журналы с разных вкладок,
// устройств и из импорта просто объединяются по id — ничего не теряется и не дублируется.
import type { Fx } from '../core/dungeon/types.ts'
import { apply, type Action, type Result } from '../core/engine.ts'
import { compareEvents, mergeEvents } from '../core/events.ts'
import { createRng } from '../core/rng.ts'
import { evolve, freshProfile, type GameState, type Profile, type ProfileEvent } from '../core/state.ts'
import { dayCtx } from './clock.ts'
import type { Meta, Storage } from './storage.ts'

/** Начальный день общего начального состояния: первое же действие сменит его на сегодняшний. */
export const EPOCH_DAY = '1970-01-01'
export const SAVE_APP = 'questlist'
export const SAVE_VERSION = 1

export function foldProfile(events: readonly ProfileEvent[]): Profile {
  let p = freshProfile(EPOCH_DAY)
  for (const e of [...events].sort(compareEvents)) p = evolve(p, e)
  return p
}

/** Минимальный канал между вкладками (BroadcastChannel или заглушка в тестах). */
export interface Channel {
  postMessage(msg: unknown): void
  listen(fn: (data: unknown) => void): void
  close?(): void
}

/** BroadcastChannel между вкладками (если браузер умеет). */
export function tabChannel(name = 'questlist'): Channel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  const bc = new BroadcastChannel(name)
  return {
    postMessage: (m) => bc.postMessage(m),
    listen: (fn) => (bc.onmessage = (ev) => fn(ev.data)),
    close: () => bc.close(),
  }
}

export interface StoreOptions {
  clock?: () => number
  channel?: Channel | null
  seed?: () => number
}

export interface StoreStatus {
  storage: Storage['kind']
  /** Последняя ошибка записи — показываем, чтобы прогресс не пропадал молча. */
  error: string | null
}

const randomSeed = () => {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return a[0]!
}

const newDev = () => {
  const a = new Uint8Array(6)
  crypto.getRandomValues(a)
  return [...a]
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 8)
}

export class GameStore {
  state: GameState
  events: ProfileEvent[]
  status: StoreStatus
  private ids: Set<string>
  private meta: Meta
  private listeners = new Set<() => void>()
  private fxListeners = new Set<(fx: readonly Fx[], state: GameState) => void>()
  private seq = 0
  private runSave: ReturnType<typeof setTimeout> | null = null
  private storage: Storage
  private opt: Required<Pick<StoreOptions, 'clock' | 'seed'>> & { channel: Channel | null }

  private constructor(storage: Storage, events: ProfileEvent[], meta: Meta, opt: GameStore['opt']) {
    this.storage = storage
    this.opt = opt
    this.events = mergeEvents(events) as ProfileEvent[]
    this.ids = new Set(this.events.map((e) => e.id))
    this.meta = meta
    this.state = { profile: foldProfile(this.events), run: meta.run }
    this.status = { storage: storage.kind, error: null }
    opt.channel?.listen((data) => this.onMessage(data))
  }

  static async open(storage: Storage, o: StoreOptions = {}): Promise<GameStore> {
    const [events, saved] = await Promise.all([storage.loadEvents(), storage.loadMeta()])
    const meta: Meta = saved ?? { dev: newDev(), lastTs: 0, run: null }
    if (!saved) await storage.saveMeta(meta)
    return new GameStore(storage, events, meta, {
      clock: o.clock ?? Date.now,
      seed: o.seed ?? randomSeed,
      channel: o.channel ?? null,
    })
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getState = () => this.state

  /** Визуальные события действия (для слоя графики): приходят до уведомления подписчиков состояния. */
  onFx = (fn: (fx: readonly Fx[], state: GameState) => void) => {
    this.fxListeners.add(fn)
    return () => this.fxListeners.delete(fn)
  }

  private emit() {
    for (const fn of this.listeners) fn()
  }

  private fail(e: unknown) {
    this.status = { ...this.status, error: e instanceof Error ? e.message : String(e) }
    this.emit()
  }

  /** Применяет действие. Время событий на устройстве строго растёт, даже если часы перевели назад. */
  dispatch(action: Action): Result {
    const wall = this.opt.clock()
    const now = Math.max(wall, this.meta.lastTs + 1)
    const ts36 = now.toString(36)
    const res = apply(this.state, action, {
      now,
      ...dayCtx(wall),
      rng: createRng(this.opt.seed()),
      dev: this.meta.dev,
      // Внутри одного действия у событий одно время — порядок задаёт счётчик в id (фиксированной ширины).
      newId: () => `${ts36}-${this.meta.dev}-${(this.seq++ % 36 ** 4).toString(36).padStart(4, '0')}`,
    })
    const runChanged = res.state.run !== this.state.run
    this.state = res.state
    if (res.events.length) {
      this.meta.lastTs = now
      for (const e of res.events) {
        this.events.push(e)
        this.ids.add(e.id)
      }
      this.opt.channel?.postMessage({ events: res.events })
      this.storage.addEvents(res.events).catch((e) => this.fail(e))
      this.saveMeta(0)
    } else if (runChanged) this.saveMeta(1500)
    if (res.fx.length) for (const fn of this.fxListeners) fn(res.fx, this.state)
    if (res.events.length || runChanged) this.emit()
    return res
  }

  /** Забег меняется на каждом шаге — пишем его с задержкой; события и время — сразу. */
  private saveMeta(delay: number) {
    if (this.runSave) clearTimeout(this.runSave)
    const write = () => {
      this.runSave = null
      this.storage.saveMeta({ ...this.meta, run: this.state.run }).catch((e) => this.fail(e))
    }
    if (delay) this.runSave = setTimeout(write, delay)
    else write()
  }

  /** Добавляет чужие события (другая вкладка, импорт, сервер). Возвращает число новых. */
  merge(incoming: readonly ProfileEvent[], persist = false): number {
    const fresh = incoming.filter((e) => !this.ids.has(e.id))
    if (!fresh.length) return 0
    for (const e of fresh) this.ids.add(e.id)
    this.events = mergeEvents(this.events, fresh) as ProfileEvent[]
    this.state = { ...this.state, profile: foldProfile(this.events) }
    if (persist) this.storage.addEvents(fresh).catch((e) => this.fail(e))
    this.emit()
    return fresh.length
  }

  /** Перечитать журнал из хранилища (вкладка снова на экране — вдруг пропустили сообщение). */
  async reload() {
    try {
      this.merge(await this.storage.loadEvents())
    } catch (e) {
      this.fail(e)
    }
  }

  private onMessage(data: unknown) {
    const events = (data as { events?: unknown })?.events
    if (Array.isArray(events) && events.every(isEvent)) this.merge(events)
  }

  exportJson(): string {
    return JSON.stringify({ app: SAVE_APP, v: SAVE_VERSION, exported: this.opt.clock(), events: this.events })
  }

  /** Импорт объединяет журналы: текущий прогресс не теряется, повторный импорт ничего не меняет. */
  importJson(text: string): number {
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('Это не JSON')
    }
    const d = data as { app?: unknown; v?: unknown; events?: unknown }
    if (d?.app !== SAVE_APP) throw new Error('Это не сохранение Квест-листа')
    if (typeof d.v !== 'number' || d.v > SAVE_VERSION) throw new Error('Сохранение из более новой версии')
    if (!Array.isArray(d.events) || !d.events.every(isEvent)) throw new Error('Журнал повреждён')
    return this.merge(d.events, true)
  }

  close() {
    this.opt.channel?.close?.()
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** Проверка формы события: чтобы испорченный файл не превратил золото в NaN. */
export function isEvent(e: unknown): e is ProfileEvent {
  if (!isObj(e)) return false
  if (typeof e.id !== 'string' || !e.id || typeof e.ts !== 'number' || !Number.isFinite(e.ts)) return false
  if (typeof e.dev !== 'string' || typeof e.type !== 'string' || !isObj(e.data)) return false
  const { add, set, tasks, skinsAdd, roll } = e.data
  if (add !== undefined && (!isObj(add) || !Object.values(add).every((v) => Number.isFinite(v)))) return false
  if (set !== undefined && !isObj(set)) return false
  if (tasks !== undefined && !Array.isArray(tasks)) return false
  if (skinsAdd !== undefined && !(Array.isArray(skinsAdd) && skinsAdd.every((s) => typeof s === 'string')))
    return false
  if (roll !== undefined && typeof roll !== 'string') return false
  return true
}
