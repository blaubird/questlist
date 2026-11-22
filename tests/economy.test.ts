import { describe, expect, it } from 'vitest'
import { foldEvents } from '../src/core/events.ts'
import { evolve, freshProfile, type ProfileEvent } from '../src/core/state.ts'
import { DAY, world } from './helpers.ts'

describe('награды за задачи', () => {
  it('база по сложности', () => {
    const w = world()
    w.task('e')
    w.task('m')
    w.task('h')
    expect(w.state.profile.gold).toBe(30 + 10 + 25 + 60)
    expect(w.state.profile.torches).toBe(1 + 1 + 1 + 2)
    expect(w.state.profile.dayCount).toBe(3)
  })

  it('быстрое закрытие: половина золота, без факелов', () => {
    const w = world()
    const add = w.act({ type: 'task.add', title: 'x', diff: 'm', daily: false })
    w.now += 60 * 1000
    const r = w.act({ type: 'task.complete', id: (add.info as { id: string }).id })
    expect((r.info as { reward: { gold: number; torches: number } }).reward).toMatchObject({
      gold: 13,
      torches: 0,
    })
  })

  it('серия: третья задача дня засчитывает день, бонус со следующего', () => {
    const w = world()
    w.task()
    w.task()
    w.task()
    expect(w.state.profile.streak).toBe(1)
    expect(w.state.profile.lastQ).toBe(DAY)
    const r = w.task('m')
    // серия 1 → +5%: 25·1,05 = 26,25 → 26
    expect((r.info as { reward: { gold: number } }).reward.gold).toBe(26)
  })

  it('дневной лимит золота 400, сверх — 25%', () => {
    const w = world()
    for (let i = 0; i < 6; i++) w.task('h') // 6·60 = 360 + бонус серии с 4-й задачи
    const before = w.state.profile.dayGold
    expect(before).toBeLessThan(400)
    const r = w.task('h')
    const g = (r.info as { reward: { gold: number } }).reward.gold
    const full = Math.round(60 * 1.05)
    const room = 400 - before
    expect(g).toBe(room + Math.round((full - room) * 0.25))
  })

  it('лимит факелов 10 в день', () => {
    const w = world()
    for (let i = 0; i < 8; i++) w.task('h')
    expect(w.state.profile.dayTorch).toBe(10)
    expect(w.state.profile.torches).toBe(1 + 10)
  })

  it('отмена откатывает награду, счётчики и серию', () => {
    const w = world()
    w.task()
    w.task()
    const before = structuredClone(w.state.profile)
    const r = w.task()
    expect(w.state.profile.streak).toBe(1)
    w.now += 3000
    const u = w.act({ type: 'task.undo', event: (r.info as { event: ProfileEvent }).event })
    expect(u.error).toBeUndefined()
    const p = w.state.profile
    expect({
      gold: p.gold,
      torches: p.torches,
      dayCount: p.dayCount,
      streak: p.streak,
      lastQ: p.lastQ,
    }).toEqual({
      gold: before.gold,
      torches: before.torches,
      dayCount: before.dayCount,
      streak: before.streak,
      lastQ: before.lastQ,
    })
  })

  it('отмена позже 7 секунд невозможна', () => {
    const w = world()
    const r = w.task()
    w.now += 8000
    expect(w.act({ type: 'task.undo', event: (r.info as { event: ProfileEvent }).event }).error).toBeDefined()
  })

  it('смена дня: ежедневные сбрасываются, выполненные разовые удаляются, счётчики обнуляются', () => {
    const w = world()
    w.task('m', true)
    w.task('m', false)
    w.act({ type: 'task.add', title: 'висит', diff: 'e', daily: false })
    w.day = '2026-11-24'
    w.yesterday = DAY
    w.act({ type: 'shop.potion' }) // любое действие запускает смену дня
    const p = w.state.profile
    expect(p.day).toBe('2026-11-24')
    expect(p.dayCount).toBe(0)
    expect(p.tasks.map((t) => [t.title, t.daily, t.done])).toEqual([
      ['Задача', true, false],
      ['висит', false, false],
    ])
  })

  it('серия продолжается на следующий день и рвётся через день', () => {
    const w = world()
    for (let i = 0; i < 3; i++) w.task()
    w.day = '2026-11-24'
    w.yesterday = DAY
    for (let i = 0; i < 3; i++) w.task()
    expect(w.state.profile.streak).toBe(2)
    w.day = '2026-11-26'
    w.yesterday = '2026-11-25'
    for (let i = 0; i < 3; i++) w.task()
    expect(w.state.profile.streak).toBe(1)
  })
})

describe('журнал', () => {
  it('свёртка журнала даёт тот же профиль, что и прямое применение', () => {
    const w = world(7)
    for (let i = 0; i < 5; i++) w.task(i % 2 ? 'h' : 'm')
    w.act({ type: 'shop.weapon', tier: 1 })
    w.act({ type: 'casino.slots', bet: 10 })
    w.act({ type: 'casino.roulette', bet: 10, on: 'red' })
    w.act({ type: 'run.start', floor: 1 })
    for (let i = 0; i < 40 && w.state.run && !w.state.run.over; i++) w.act({ type: 'run.step', dx: 1, dy: 0 })
    if (w.state.run?.over) w.act({ type: 'run.finish' })
    const folded = foldEvents(freshProfile(DAY), w.log, evolve)
    expect(folded).toEqual(w.state.profile)
  })

  it('дубль события смены дня не стирает счётчики другого устройства', () => {
    const w = world()
    w.day = '2026-11-24'
    w.yesterday = DAY
    w.task()
    const roll = w.log.find((e) => e.type === 'day.roll')!
    const p = evolve(w.state.profile, { ...roll, id: 'other-device-roll' })
    expect(p.dayCount).toBe(1)
  })
})

describe('лавка', () => {
  it('нельзя купить без золота и дешевле текущего', () => {
    const w = world()
    expect(w.act({ type: 'shop.weapon', tier: 2 }).error).toBeDefined()
    w.state = { ...w.state, profile: { ...w.state.profile, gold: 1000 } }
    expect(w.act({ type: 'shop.weapon', tier: 2 }).error).toBeUndefined()
    expect(w.act({ type: 'shop.weapon', tier: 1 }).error).toBeDefined()
    expect(w.state.profile.gold).toBe(800)
  })

  it('заточка тратит золото и осколки по формуле', () => {
    const w = world()
    w.state = { ...w.state, profile: { ...w.state.profile, gold: 100, shards: 100 } }
    w.act({ type: 'shop.enhance', weapon: true })
    w.act({ type: 'shop.enhance', weapon: true })
    expect(w.state.profile).toMatchObject({ wEnh: 2, gold: 100 - 15 - 30, shards: 100 - 8 - 16 })
  })
})
