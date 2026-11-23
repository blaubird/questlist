import { describe, expect, it } from 'vitest'
import { MON_GROWTH, SCALE_FROM } from '../src/core/config.ts'
import { genFloor } from '../src/core/dungeon/gen.ts'
import { monScale } from '../src/core/dungeon/scale.ts'
import { betOptions } from '../src/core/engine.ts'
import { blessCost, enhCost, heroStats, pickHero, soulsFor } from '../src/core/hero.ts'
import { createRng } from '../src/core/rng.ts'
import { freshProfile } from '../src/core/state.ts'
import { DAY, world } from './helpers.ts'

describe('масштаб', () => {
  it('до 20-го этажа монстры как в прототипе, дальше — экспонента', () => {
    expect(monScale(SCALE_FROM).hp).toBeCloseTo(1 + 0.12 * (SCALE_FROM - 1), 9)
    expect(monScale(SCALE_FROM).atk).toBeCloseTo(1 + 0.08 * (SCALE_FROM - 1), 9)
    expect(monScale(SCALE_FROM + 10).hp).toBeCloseTo((1 + 0.12 * (SCALE_FROM + 9)) * MON_GROWTH.hp ** 10, 6)
  })

  it('этаж 1000 генерируется, числа конечные', () => {
    let id = 0
    const fl = genFloor(1000, createRng(2), () => ++id)
    for (const m of fl.mons) {
      expect(Number.isFinite(m.hp)).toBe(true)
      expect(m.hp).toBeGreaterThan(1e20)
    }
  })

  it('заточка выше +25 стоит только осколки и растёт экспоненциально', () => {
    expect(enhCost(true, 24).gold).toBeGreaterThan(0)
    const a = enhCost(true, 25)
    const b = enhCost(true, 26)
    expect(a.gold).toBe(0)
    expect(b.shards / a.shards).toBeCloseTo(1.08, 2)
  })

  it('благословения: цена линейная, эффект множителем', () => {
    expect(blessCost(0)).toBe(300)
    expect(blessCost(10)).toBe(1300)
    const p = freshProfile(DAY)
    const base = heroStats(pickHero(p)).atk
    const blessed = heroStats(pickHero({ ...p, blessAtk: 10 })).atk
    expect(blessed / base).toBeCloseTo(1.1 ** 10, 6)
  })

  it('души растут с чекпоинтом и не убывают', () => {
    let prev = 0
    for (let cp = 1; cp <= 1001; cp += 5) {
      const s = soulsFor(cp)
      expect(s).toBeGreaterThanOrEqual(prev)
      prev = s
    }
    expect(soulsFor(21)).toBe(0)
    expect(soulsFor(31)).toBe(3)
  })

  it('благословения закрыты до чекпоинта 21', () => {
    const w = world()
    w.state = { ...w.state, profile: { ...w.state.profile, gold: 10_000 } }
    expect(w.act({ type: 'shop.bless', track: 'atk' }).error).toBeDefined()
    w.state = { ...w.state, profile: { ...w.state.profile, checkpoint: 21 } }
    expect(w.act({ type: 'shop.bless', track: 'atk' }).error).toBeUndefined()
    expect(w.state.profile).toMatchObject({ blessAtk: 1, gold: 9700 })
  })

  it('ставки — доли баланса, минимум 10', () => {
    expect(betOptions(30)).toEqual([10])
    expect(betOptions(10_000)).toEqual([100, 500, 1000, 2500])
  })
})
