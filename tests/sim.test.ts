import { describe, expect, it } from 'vitest'
import { simulate } from '../scripts/bot.ts'

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

describe('бот баланса: ранняя игра как в прототипе', () => {
  const runs = [1, 2, 3, 4].map((s) => simulate(21, s))
  const at = (d: number) => median(runs.map((r) => r[d - 1]!.best))

  it('этаж к 10-му дню ≈ 15–18', () => {
    expect(at(10)).toBeGreaterThanOrEqual(15)
    expect(at(10)).toBeLessThanOrEqual(18)
  })
  it('этаж к 15-му дню ≈ 17–22', () => {
    expect(at(15)).toBeGreaterThanOrEqual(17)
    expect(at(15)).toBeLessThanOrEqual(22)
  })
  it('этаж к 21-му дню ≈ 21–25', () => {
    expect(at(21)).toBeGreaterThanOrEqual(21)
    expect(at(21)).toBeLessThanOrEqual(25)
  })
  it('свитков меньше 15 за 21 день', () => {
    for (const r of runs) expect(r[20]!.scrolls).toBeLessThan(15)
  })
}, 60_000)
