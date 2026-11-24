// Два устройства играют офлайн с одного журнала, потом журналы сливаются.
// Слияние не должно ни терять прогресс, ни удваивать награды, ни уводить ресурсы в минус.
import { describe, expect, it } from 'vitest'
import { WEAPONS } from '../src/core/config.ts'
import { memoryStorage } from '../src/sync/storage.ts'
import { GameStore, foldProfile } from '../src/sync/store.ts'

const T = new Date(2026, 10, 23, 10, 0, 0).getTime()

async function device(t: { now: number }, seed0: number) {
  let seed = seed0
  return GameStore.open(memoryStorage(), { clock: () => t.now, seed: () => seed++ })
}

async function pair() {
  const t = { now: T }
  const a = await device(t, 1)
  const b = await device(t, 1000)
  return { t, a, b }
}

const sync = (x: GameStore, y: GameStore) => {
  x.merge(y.events)
  y.merge(x.events)
}

function task(s: GameStore, t: { now: number }, diff: 'e' | 'm' | 'h' = 'h') {
  t.now += 60_000
  return (s.dispatch({ type: 'task.add', title: 'Дело', diff, daily: false }).info as { id: string }).id
}

describe('слияние журналов двух устройств', () => {
  it('одну задачу закрыли на обоих устройствах — награда одна', async () => {
    const { t, a, b } = await pair()
    const id = task(a, t)
    sync(a, b)
    const before = a.state.profile.gold
    t.now += 20 * 60_000
    const ra = a.dispatch({ type: 'task.complete', id })
    t.now += 1000
    b.dispatch({ type: 'task.complete', id })
    sync(a, b)
    expect(a.state.profile).toEqual(b.state.profile)
    expect(a.state.profile.totalDone).toBe(1)
    expect(a.state.profile.gold).toBe(before + ra.events.at(-1)!.data.add!.gold!)
  })

  it('офлайн потратили одно золото на двух устройствах — второе действие не проходит', async () => {
    const { t, a, b } = await pair()
    const cost = WEAPONS[1]!.cost
    while (a.state.profile.gold < cost) {
      const id = task(a, t)
      t.now += 20 * 60_000
      a.dispatch({ type: 'task.complete', id })
    }
    // Хватает только на одно благословение или один меч — тратим на обоих.
    sync(a, b)
    const gold = a.state.profile.gold
    t.now += 1000
    expect(a.dispatch({ type: 'shop.weapon', tier: 1 }).error).toBeUndefined()
    t.now += 1000
    expect(b.dispatch({ type: 'shop.weapon', tier: 1 }).error).toBeUndefined()
    t.now += 1000
    for (let i = 0; i < 30 && b.state.profile.gold > 0; i++)
      b.dispatch({ type: 'casino.slots', bet: Math.max(1, Math.floor(b.state.profile.gold / 2)) })
    sync(a, b)
    const p = a.state.profile
    expect(b.state.profile).toEqual(p)
    expect(p.weapon).toBe(1)
    expect(p.gold).toBeGreaterThanOrEqual(0)
    expect(p.gold).toBeLessThanOrEqual(gold - cost)
  })

  it('устаревшее устройство не откатывает рекорд, чекпоинт и тир', async () => {
    const { a, b } = await pair()
    sync(a, b)
    // Вручную: событие с a поднимает рекорд, позже b пишет меньший.
    const mk = (dev: string, ts: number, data: object) => ({
      id: `${ts.toString(36)}-${dev}-0000`,
      ts,
      dev,
      type: 'run.end',
      data,
    })
    a.merge([
      mk('aaaa', T + 10, { max: { best: 40, checkpoint: 36 } }),
      mk('bbbb', T + 20, { max: { best: 12, checkpoint: 11 } }),
    ])
    expect(a.state.profile.best).toBe(40)
    expect(a.state.profile.checkpoint).toBe(36)
  })

  it('отмена задачи после траты награды не уводит золото в минус', async () => {
    const t = { now: T }
    const s = await device(t, 1)
    const cost = WEAPONS[1]!.cost
    let last = null
    while (s.state.profile.gold < cost) {
      const id = task(s, t)
      t.now += 20 * 60_000
      last = s.dispatch({ type: 'task.complete', id })
    }
    s.dispatch({ type: 'shop.weapon', tier: 1 })
    t.now += 1000
    const undo = s.dispatch({ type: 'task.undo', event: last!.events.at(-1)! })
    if (s.state.profile.gold < (last!.events.at(-1)!.data.add?.gold ?? 0))
      expect(undo.error).toBe('Награда уже потрачена')
    expect(s.state.profile.gold).toBeGreaterThanOrEqual(0)
  })

  it('свёртка после слияния не зависит от того, на каком устройстве считать', async () => {
    const { t, a, b } = await pair()
    for (let i = 0; i < 6; i++) {
      const id = task(i % 2 ? a : b, t, i % 3 ? 'm' : 'e')
      t.now += 15 * 60_000
      ;(i % 2 ? a : b).dispatch({ type: 'task.complete', id })
      ;(i % 2 ? b : a).dispatch({ type: 'casino.slots', bet: 1 })
    }
    sync(a, b)
    expect(a.state.profile).toEqual(b.state.profile)
    expect(foldProfile([...b.events].reverse())).toEqual(a.state.profile)
  })
})
