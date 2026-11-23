import { describe, expect, it } from 'vitest'
import { memoryStorage } from '../src/sync/storage.ts'
import { GameStore, foldProfile, type Channel } from '../src/sync/store.ts'
import { localDay } from '../src/sync/clock.ts'

const T = new Date(2026, 10, 23, 10, 0, 0).getTime()

function bus() {
  const peers: (Channel & { deliver: (d: unknown) => void })[] = []
  const make = (): Channel => {
    let fn: ((d: unknown) => void) | null = null
    const ch: Channel & { deliver: (d: unknown) => void } = {
      listen: (f) => (fn = f),
      deliver: (d) => fn?.(d),
      postMessage: (msg) => {
        for (const p of peers) if (p !== ch) p.deliver(structuredClone(msg))
      },
    }
    peers.push(ch)
    return ch
  }
  return make
}

async function store(
  o: { storage?: ReturnType<typeof memoryStorage>; t?: { now: number }; channel?: Channel } = {},
) {
  const t = o.t ?? { now: T }
  let seed = 1
  const s = await GameStore.open(o.storage ?? memoryStorage(), {
    clock: () => t.now,
    seed: () => seed++,
    channel: o.channel ?? null,
  })
  return { s, t }
}

function addDone(s: GameStore, t: { now: number }, diff: 'e' | 'm' | 'h' = 'm') {
  const add = s.dispatch({ type: 'task.add', title: 'Дело', diff, daily: false })
  t.now += 10 * 60_000
  return s.dispatch({ type: 'task.complete', id: (add.info as { id: string }).id })
}

describe('хранилище', () => {
  it('первое действие переводит профиль в сегодняшний день; tick — только смена дня', async () => {
    const { s } = await store()
    expect(s.dispatch({ type: 'tick' }).events.map((e) => e.type)).toEqual(['day.roll'])
    expect(s.state.profile.day).toBe(localDay(T))
    expect(s.dispatch({ type: 'tick' }).events).toEqual([])
  })

  it('перезапуск из хранилища даёт то же состояние (свёртка = прямое применение)', async () => {
    const storage = memoryStorage()
    const { s, t } = await store({ storage })
    for (let i = 0; i < 4; i++) addDone(s, t, i % 2 ? 'h' : 'e')
    s.dispatch({ type: 'shop.weapon', tier: 1 })
    for (let i = 0; i < 20; i++) s.dispatch({ type: 'casino.slots', bet: 10 })
    await new Promise((r) => setTimeout(r, 0))
    const again = await store({ storage, t })
    expect(again.s.state.profile).toEqual(s.state.profile)
  })

  it('часы перевели назад — время событий всё равно растёт, порядок свёртки не ломается', async () => {
    const { s, t } = await store()
    addDone(s, t, 'h')
    t.now -= 3 * 3_600_000
    s.dispatch({ type: 'shop.weapon', tier: 1 })
    const ts = s.events.map((e) => e.ts)
    expect([...ts].sort((a, b) => a - b)).toEqual(ts)
    expect(foldProfile(s.events)).toEqual(s.state.profile)
  })

  it('две вкладки: события доходят друг до друга, ничего не теряется', async () => {
    const make = bus()
    const storage = memoryStorage()
    const a = await store({ storage, channel: make() })
    const b = await store({ storage, channel: make(), t: a.t })
    addDone(a.s, a.t)
    addDone(b.s, a.t, 'h')
    expect(a.s.state.profile).toEqual(b.s.state.profile)
    expect(a.s.state.profile.totalDone).toBe(2)
  })

  it('экспорт → импорт в чистое устройство восстанавливает профиль, повторный импорт ничего не меняет', async () => {
    const { s, t } = await store()
    for (let i = 0; i < 3; i++) addDone(s, t)
    const json = s.exportJson()
    const other = await store()
    expect(other.s.importJson(json)).toBe(s.events.length)
    expect(other.s.state.profile).toEqual(s.state.profile)
    expect(other.s.importJson(json)).toBe(0)
  })

  it('импорт объединяет: прогресс с обоих устройств сохраняется', async () => {
    const a = await store()
    const b = await store()
    addDone(a.s, a.t, 'h')
    addDone(b.s, b.t, 'e')
    a.s.importJson(b.s.exportJson())
    expect(a.s.state.profile.totalDone).toBe(2)
  })

  it('испорченный файл отклоняется и не портит профиль', async () => {
    const { s, t } = await store()
    addDone(s, t)
    const before = s.state.profile
    expect(() => s.importJson('не json')).toThrow()
    expect(() => s.importJson('{"app":"other","v":1,"events":[]}')).toThrow()
    const bad = {
      app: 'questlist',
      v: 1,
      events: [{ id: 'x', ts: 1, dev: 'd', type: 't', data: { add: { gold: 'много' } } }],
    }
    expect(() => s.importJson(JSON.stringify(bad))).toThrow()
    expect(() => s.importJson(JSON.stringify({ ...bad, v: 99 }))).toThrow()
    expect(s.state.profile).toBe(before)
  })
})
