import { describe, expect, it } from 'vitest'
import { rollChest, rouletteRtp, slotRtp, spinSlots } from '../src/core/casino.ts'
import { createRng } from '../src/core/rng.ts'
import { world } from './helpers.ts'

describe('казино', () => {
  it('точный RTP слотов 93,48%', () => {
    expect(slotRtp()).toBeCloseTo(0.9348, 4)
  })

  it('RTP рулетки 97,3% на цвет и на зеро', () => {
    expect(rouletteRtp('red')).toBeCloseTo(36 / 37, 6)
    expect(rouletteRtp('black')).toBeCloseTo(36 / 37, 6)
    expect(rouletteRtp('zero')).toBeCloseTo(36 / 37, 6)
  })

  it('матожидание отрицательное и на практике', () => {
    const rng = createRng(3)
    let ret = 0
    const n = 200_000
    for (let i = 0; i < n; i++) ret += spinSlots(rng).mult
    expect(ret / n).toBeLessThan(1)
    expect(ret / n).toBeCloseTo(0.9348, 1)
  })

  it('шансы сундука', () => {
    const rng = createRng(11)
    const c = { common: 0, rare: 0, epic: 0, legendary: 0 }
    const n = 100_000
    for (let i = 0; i < n; i++) c[rollChest(rng).rarity]++
    expect(c.common / n).toBeCloseTo(0.6, 1)
    expect(c.rare / n).toBeCloseTo(0.28, 1)
    expect(c.epic / n).toBeCloseTo(0.1, 1)
    expect(c.legendary / n).toBeCloseTo(0.02, 2)
  })

  it('итог казино копит casinoNet, повтор облика даёт 12 осколков', () => {
    const w = world(5)
    w.state = { ...w.state, profile: { ...w.state.profile, gold: 10_000 } }
    for (let i = 0; i < 50; i++) w.act({ type: 'casino.slots', bet: 100 })
    const p = w.state.profile
    expect(p.gold - 10_000).toBe(p.casinoNet)
    const skinsBefore = p.skins.length
    for (let i = 0; i < 40; i++) w.act({ type: 'casino.chest', scroll: false })
    const q = w.state.profile
    const dups = 40 - (q.skins.length - skinsBefore)
    expect(q.shards).toBe(dups * 12)
  })

  it('нестандартная ставка и ставка без золота отклоняются', () => {
    const w = world()
    expect(w.act({ type: 'casino.slots', bet: 7 }).error).toBeDefined()
    expect(w.act({ type: 'casino.slots', bet: 100 }).error).toBeDefined()
  })
})
