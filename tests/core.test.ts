import { describe, expect, it } from 'vitest'
import { type GameEvent, foldEvents, mergeEvents } from '../src/core/events.ts'
import { formatBig } from '../src/core/format.ts'
import { createRng, seedFrom } from '../src/core/rng.ts'

describe('rng', () => {
  it('детерминирован от seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    const seqA = Array.from({ length: 100 }, () => a.next())
    const seqB = Array.from({ length: 100 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('продолжает с сохранённого состояния', () => {
    const a = createRng(seedFrom('floor-7'))
    for (let i = 0; i < 10; i++) a.next()
    const b = createRng(a.state())
    expect(b.next()).toBe(a.next())
  })

  it('int в границах и все значения встречаются', () => {
    const r = createRng(1)
    const seen = new Set<number>()
    for (let i = 0; i < 10_000; i++) {
      const v = r.int(1, 6)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
      seen.add(v)
    }
    expect(seen.size).toBe(6)
  })
})

describe('formatBig', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1K'],
    [12_345, '12,3K'],
    [100_000, '100K'],
    [200e6, '200M'],
    [10_000, '10K'],
    [999_950, '1M'],
    [1_500_000, '1,5M'],
    [2.5e9, '2,5B'],
    [123e33, '123Dc'],
    [1.234e45, '1,23e45'],
    [-4200, '−4,2K'],
  ])('%d → %s', (n, s) => {
    expect(formatBig(n)).toBe(s)
  })
})

describe('журнал событий', () => {
  const ev = (id: string, ts: number, gold: number): GameEvent<'gold', number> => ({
    id,
    ts,
    dev: 'test',
    type: 'gold',
    data: gold,
  })
  const sum = (s: number, e: GameEvent) => s + (e.data as number)

  it('слияние без дублей и не зависит от порядка', () => {
    const phone = [ev('a', 1, 10), ev('b', 3, 25)]
    const pc = [ev('c', 2, 60), ev('a', 1, 10)]
    const m1 = mergeEvents(phone, pc)
    const m2 = mergeEvents(pc, phone)
    expect(m1.map((e) => e.id)).toEqual(['a', 'c', 'b'])
    expect(m2).toEqual(m1)
    expect(foldEvents(0, m1, sum)).toBe(95)
  })
})
