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

describe('бот баланса: поздняя игра без стен и без снежного кома', () => {
  const rows = simulate(90, 1)
  const day = (d: number) => rows[d - 1]!

  it('уровень ~1000 к третьему месяцу', () => {
    expect(day(90).lvl).toBeGreaterThan(700)
    expect(day(90).lvl).toBeLessThan(2000)
  })
  it('нет стен: чекпоинт растёт каждые 10 дней после 30-го', () => {
    for (let d = 40; d <= 90; d += 10) expect(day(d).cp).toBeGreaterThan(day(d - 10).cp)
  })
  it('нет снежного кома: герой всё ещё гибнет, темп ниже потолка забегов', () => {
    const late = rows.slice(60)
    expect(late.reduce((s, r) => s + r.deaths, 0)).toBeGreaterThan(30)
    for (let i = 61; i < 90; i++) expect(rows[i]!.cp - rows[i - 1]!.cp).toBeLessThan(25)
  })
}, 120_000)
