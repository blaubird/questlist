import { describe, expect, it } from 'vitest'
import { AFFIX, BOSS_ENRAGE, FLOOR_MOD, MAP_W } from '../src/core/config.ts'
import { isWall } from '../src/core/dungeon/fov.ts'
import { genFloor } from '../src/core/dungeon/gen.ts'
import { runStep, startRun } from '../src/core/dungeon/run.ts'
import type { Monster, Run } from '../src/core/dungeon/types.ts'
import { pickHero } from '../src/core/hero.ts'
import { createRng } from '../src/core/rng.ts'
import { freshProfile } from '../src/core/state.ts'
import { DAY } from './helpers.ts'

/** Сильный герой на этаже f, монстры убраны — тест ставит своих. */
function arena(f: number, heroLvl = 200): Run {
  const p = { ...freshProfile(DAY), lvl: heroLvl, weapon: 5, armor: 4, wEnh: 10, aEnh: 10 }
  const r = startRun({ hero: { ...pickHero(p), xp: 0 }, startFloor: f, seed: 7, potions: 0 })
  r.mons = []
  r.items = []
  return r
}

/** Свободная соседняя клетка героя. */
function nextTo(r: Run): [number, number] {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const)
    if (!isWall(r.map, r.px + dx, r.py + dy)) return [r.px + dx, r.py + dy]
  throw new Error('нет соседней клетки')
}

function mon(r: Run, o: Partial<Monster>): Monster {
  const [x, y] = nextTo(r)
  const m: Monster = {
    id: 900 + r.mons.length,
    kind: 'ogre',
    name: 'Огр',
    hp: 100,
    mhp: 100,
    atk: 1,
    xp: 1,
    x,
    y,
    awake: true,
    boss: false,
    elite: true,
    affix: null,
    shield: 0,
    ...o,
  }
  r.mons.push(m)
  return m
}

describe('глубина: свойства элиты, ярость боссов, модификаторы этажей', () => {
  it('до 25-го этажа нет ни модификаторов, ни свойств элиты (ранняя игра как в прототипе)', () => {
    for (let seed = 1; seed <= 40; seed++)
      for (let f = 1; f < FLOOR_MOD.fromFloor; f++) {
        let id = 0
        const fl = genFloor(f, createRng(seed * 1000 + f), () => ++id)
        expect(fl.mod).toBeNull()
        for (const m of fl.mons) expect(m.affix ?? null).toBeNull()
      }
  })

  it('глубже 26-го: модификаторы примерно на половине этажей, у элиты есть свойства', () => {
    let mods = 0
    let elites = 0
    let affixed = 0
    const n = 400
    for (let seed = 1; seed <= n; seed++) {
      let id = 0
      const fl = genFloor(40 + (seed % 50), createRng(seed), () => ++id)
      if (fl.mod) mods++
      for (const m of fl.mons)
        if (m.elite) {
          elites++
          if (m.affix) affixed++
        }
    }
    expect(mods / n).toBeGreaterThan(0.4)
    expect(mods / n).toBeLessThan(0.6)
    expect(affixed).toBe(elites)
  })

  it('щит поглощает удары целиком, потом урон проходит', () => {
    const r = arena(40)
    const m = mon(r, { affix: 'shield', shield: AFFIX.shieldCharges, hp: 1e6, mhp: 1e6 })
    for (let i = 0; i < AFFIX.shieldCharges; i++) {
      const fx = runStep(r, m.x - r.px, m.y - r.py)
      expect(fx.some((f) => f.t === 'block')).toBe(true)
      expect(m.hp).toBe(1e6)
    }
    runStep(r, m.x - r.px, m.y - r.py)
    expect(m.hp).toBeLessThan(1e6)
  })

  it('взрывной ранит героя при гибели рядом', () => {
    const r = arena(40)
    const before = r.hp
    const m = mon(r, { affix: 'explosive', hp: 1, mhp: 1, atk: 1e6 })
    const fx = runStep(r, m.x - r.px, m.y - r.py)
    expect(fx.some((f) => f.t === 'boom')).toBe(true)
    expect(r.hp).toBeLessThan(before)
  })

  it('вампир лечится, раня героя', () => {
    const r = arena(40)
    const m = mon(r, { affix: 'vampire', hp: 50, mhp: 100, atk: 1e9 })
    let healed = false
    for (let i = 0; i < 10 && !healed && !r.over; i++) healed = runStep(r, 0, 0).some((f) => f.t === 'heal')
    expect(healed).toBe(true)
    expect(m.hp).toBeGreaterThan(50)
  })

  it('быстрый делает два шага за ход', () => {
    const r = arena(40)
    // ставим быстрого в 4 клетках по прямой коридору, если получится; иначе проверяем по числу move-эффектов
    const m = mon(r, { affix: 'swift', atk: 1 })
    m.x = r.px
    m.y = r.py
    // найти клетку пола на расстоянии ≥3 по пути
    let far: [number, number] | null = null
    for (let y = 0; y < r.map.length && !far; y++)
      for (let x = 0; x < MAP_W && !far; x++)
        if (!isWall(r.map, x, y) && Math.abs(x - r.px) + Math.abs(y - r.py) === 4) far = [x, y]
    m.x = far![0]
    m.y = far![1]
    const fx = runStep(r, 0, 0)
    expect(fx.filter((f) => f.t === 'move' && f.who === m.id).length).toBe(2)
  })

  it('босс впадает в ярость на половине здоровья один раз и зовёт свиту', () => {
    const r = arena(BOSS_ENRAGE.fromFloor + 5, 1)
    const b = mon(r, { boss: true, elite: false, kind: 'troll', hp: 1000, mhp: 1000, atk: 1 })
    r.hero = { ...r.hero, wEnh: 10 }
    let enraged = 0
    for (let i = 0; i < 400 && r.mons.includes(b) && !r.over; i++)
      enraged += runStep(r, b.x - r.px, b.y - r.py).filter((f) => f.t === 'enrage').length
    expect(enraged).toBe(1)
    expect(b.enraged).toBe(true)
    expect(r.mons.filter((m) => m !== b).length).toBeLessThanOrEqual(BOSS_ENRAGE.minions)
  })
})
