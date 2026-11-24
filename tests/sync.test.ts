// Синхронизация на поддельном сервере: офлайн-очередь, догонялка по курсору, живые события, вход.
import { describe, expect, it } from 'vitest'
import type { ProfileEvent } from '../src/core/state.ts'
import { memoryStorage } from '../src/sync/storage.ts'
import { GameStore } from '../src/sync/store.ts'
import { RemoteError, Sync, rewind, type Remote, type RemoteEvent } from '../src/sync/sync.ts'

const T = new Date(2026, 10, 23, 10, 0, 0).getTime()

function server() {
  const rows: RemoteEvent[] = []
  const subs = new Set<(e: RemoteEvent) => void>()
  let n = 0
  const s = {
    rows,
    online: true,
    tokenValid: true,
    pushes: 0,
    remote(): Remote & { logged: boolean } {
      const r = {
        logged: true,
        userId: () => (r.logged ? 'u1' : null),
        userEmail: () => (r.logged ? 'me@example.test' : null),
        login: async () => {
          if (!s.online) throw new RemoteError('offline', 'нет сети')
          r.logged = true
          s.tokenValid = true
        },
        logout: () => {
          r.logged = false
        },
        refresh: async () => {
          if (!s.online) throw new RemoteError('offline', 'нет сети')
          if (!s.tokenValid) throw new RemoteError('auth', 'просрочен')
        },
        push: async (e: ProfileEvent) => {
          if (!s.online) throw new RemoteError('offline', 'нет сети')
          if (!s.tokenValid) throw new RemoteError('auth', 'просрочен')
          s.pushes++
          if (rows.some((x) => x.id === e.id)) return 'dup' as const
          const created = new Date(T + 1000 * ++n).toISOString().replace('T', ' ')
          const row = { ...structuredClone(e), created }
          rows.push(row)
          for (const fn of subs) fn(structuredClone(row))
          return 'ok' as const
        },
        pull: async (since: string | null, page: number, per: number) => {
          if (!s.online) throw new RemoteError('offline', 'нет сети')
          const all = rows.filter((x) => !since || x.created >= since)
          return structuredClone(all.slice((page - 1) * per, page * per))
        },
        subscribe: async (fn: (e: RemoteEvent) => void) => {
          subs.add(fn)
          return () => subs.delete(fn)
        },
      }
      return r
    },
  }
  return s
}

async function device(srv: ReturnType<typeof server>, t: { now: number }, seed0: number) {
  let seed = seed0
  const storage = memoryStorage()
  const store = await GameStore.open(storage, { clock: () => t.now, seed: () => seed++ })
  const remote = srv.remote()
  const sync = new Sync(store, remote, { clock: () => t.now, debounceMs: 0 })
  return { store, storage, remote, sync }
}

const tick = () => new Promise((r) => setTimeout(r, 5))

function closeTask(store: GameStore, t: { now: number }) {
  const id = (
    store.dispatch({ type: 'task.add', title: 'Позвонить', diff: 'h', daily: false }).info as { id: string }
  ).id
  t.now += 20 * 60_000
  store.dispatch({ type: 'task.complete', id })
  return id
}

describe('синхронизация', () => {
  it('задача, закрытая на телефоне без сети, появляется на компе, когда телефон снова в сети', async () => {
    const srv = server()
    const t = { now: T }
    const phone = await device(srv, t, 1)
    const pc = await device(srv, t, 500)
    await phone.sync.start()
    await pc.sync.start()

    srv.online = false
    const id = closeTask(phone.store, t)
    await phone.sync.syncNow()
    expect(phone.sync.status.state).toBe('offline')
    expect(phone.sync.status.pending).toBeGreaterThan(0)
    expect(pc.store.state.profile.tasks.find((x) => x.id === id)).toBeUndefined()

    srv.online = true
    await phone.sync.syncNow()
    expect(phone.sync.status).toMatchObject({ state: 'ok', pending: 0 })
    // Комп получил живое событие сразу.
    expect(pc.store.state.profile.tasks.find((x) => x.id === id)?.done).toBe(true)
    expect(pc.store.state.profile).toEqual(phone.store.state.profile)
  })

  it('без живой подписки комп догоняет по курсору и не теряет ничего при повторе', async () => {
    const srv = server()
    const t = { now: T }
    const a = await device(srv, t, 1)
    await a.sync.start()
    for (let i = 0; i < 7; i++) closeTask(a.store, t)
    await a.sync.syncNow()
    const b = await device(srv, t, 900)
    // b подключается позже — живых событий не видел.
    await b.sync.start()
    expect(b.store.state.profile).toEqual(a.store.state.profile)
    expect(await b.storage.loadEvents()).toHaveLength(a.store.events.length)
    // Повторная подкачка ничего не дублирует, свои события b не отправляет повторно.
    const pushes = srv.pushes
    await b.sync.syncNow()
    expect(srv.pushes).toBe(pushes)
    expect(b.store.events).toHaveLength(a.store.events.length)
  })

  it('журнал, накопленный до входа, уходит на сервер после входа', async () => {
    const srv = server()
    const t = { now: T }
    const a = await device(srv, t, 1)
    a.remote.logged = false
    await a.sync.start()
    expect(a.sync.status.state).toBe('signedout')
    closeTask(a.store, t)
    await tick()
    await a.sync.login('me@example.test', 'x')
    expect(a.sync.status).toMatchObject({ state: 'ok', pending: 0 })
    expect(srv.rows).toHaveLength(a.store.events.length)
  })

  it('ответ сервера потерялся — повторная отправка не дублирует (dup)', async () => {
    const srv = server()
    const t = { now: T }
    const a = await device(srv, t, 1)
    await a.sync.start()
    closeTask(a.store, t)
    // Сервер принял, а клиент об этом не узнал: события снова в очереди.
    await a.sync.syncNow()
    await a.storage.addEvents(a.store.events, true)
    await a.sync.syncNow()
    expect(srv.rows).toHaveLength(a.store.events.length)
    expect(a.sync.status.pending).toBe(0)
  })

  it('просроченный вход — статус «войдите снова», очередь не теряется', async () => {
    const srv = server()
    const t = { now: T }
    const a = await device(srv, t, 1)
    await a.sync.start()
    srv.tokenValid = false
    closeTask(a.store, t)
    await a.sync.syncNow()
    expect(a.sync.status.state).toBe('signedout')
    expect(a.sync.status.error).toMatch(/Войдите снова/)
    expect(a.sync.status.pending).toBeGreaterThan(0)
    await a.sync.login('me@example.test', 'x')
    expect(a.sync.status.pending).toBe(0)
  })

  it('курсор с перекрытием', () => {
    expect(rewind('2026-11-24 10:00:10.000Z', 15_000)).toBe('2026-11-24 09:59:55.000Z')
  })
})
