import { describe, expect, it } from 'vitest'
import { MAP_H, MAP_W } from '../src/core/config.ts'
import { genFloor } from '../src/core/dungeon/gen.ts'
import { startRun } from '../src/core/dungeon/run.ts'
import { createRng } from '../src/core/rng.ts'

function reachable(map: string[], sx: number, sy: number): Set<string> {
  const seen = new Set([`${sx},${sy}`])
  const q = [[sx, sy] as const]
  while (q.length) {
    const [x, y] = q.shift()!
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx
      const ny = y + dy
      const k = `${nx},${ny}`
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H || map[ny]![nx] === '#' || seen.has(k)) continue
      seen.add(k)
      q.push([nx, ny])
    }
  }
  return seen
}

describe('генерация этажа', () => {
  it('детерминирована от seed', () => {
    let a = 0
    let b = 0
    const f1 = genFloor(7, createRng(123), () => ++a)
    const f2 = genFloor(7, createRng(123), () => ++b)
    expect(f1).toEqual(f2)
  })

  it('500 этажей: карта связна, портал достижим, всё стоит на полу', () => {
    for (let s = 1; s <= 500; s++) {
      const f = 1 + (s % 30)
      let id = 0
      const fl = genFloor(f, createRng(s), () => ++id)
      expect(fl.map).toHaveLength(MAP_H)
      expect(fl.map.every((row) => row.length === MAP_W)).toBe(true)
      const floor = new Set<string>()
      fl.map.forEach((row, y) => [...row].forEach((c, x) => c === '.' && floor.add(`${x},${y}`)))
      const reach = reachable(fl.map, fl.px, fl.py)
      expect(reach.size).toBe(floor.size)
      expect(reach.has(`${fl.stairs[0]},${fl.stairs[1]}`)).toBe(true)
      for (const m of fl.mons) {
        expect(reach.has(`${m.x},${m.y}`)).toBe(true)
        if (!m.boss) expect(Math.abs(m.x - fl.px) + Math.abs(m.y - fl.py)).toBeGreaterThanOrEqual(5)
      }
      for (const it of fl.items) expect(reach.has(`${it.x},${it.y}`)).toBe(true)
      const pos = [...fl.mons.map((m) => `${m.x},${m.y}`), ...fl.items.map((i) => `${i.x},${i.y}`)]
      expect(new Set(pos).size).toBe(pos.length)
    }
  })

  it('число монстров и босс по формуле', () => {
    let id = 0
    const f10 = genFloor(10, createRng(5), () => ++id)
    expect(f10.mons.filter((m) => m.boss)).toHaveLength(1)
    expect(f10.bossDead).toBe(false)
    expect(f10.mons.find((m) => m.boss)!.kind).toBe('troll')
    const f3 = genFloor(3, createRng(5), () => ++id)
    expect(f3.mons.length).toBeLessThanOrEqual(Math.min(20, 6 + Math.floor(3 * 0.8)))
    expect(f3.bossDead).toBe(true)
  })
})

describe('забег', () => {
  it('один и тот же seed и ходы дают одинаковый результат', () => {
    const play = () => {
      const r = startRun({
        hero: { lvl: 3, xp: 0, weapon: 1, armor: 1, wEnh: 0, aEnh: 0 },
        startFloor: 1,
        seed: 99,
        potions: 2,
      })
      return r
    }
    expect(play()).toEqual(play())
  })
})
