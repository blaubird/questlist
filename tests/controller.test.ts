import { describe, expect, it } from 'vitest'
import { MAP_W } from '../src/core/config.ts'
import { isWall } from '../src/core/dungeon/fov.ts'
import { Controller, findPath, type Schedule } from '../src/game/controller.ts'
import { world } from './helpers.ts'

/** Планировщик, который копит задачи — тест сам крутит время. */
function manual() {
  const q: (() => void)[] = []
  const schedule: Schedule = (fn) => {
    q.push(fn)
    return () => {
      const i = q.indexOf(fn)
      if (i >= 0) q.splice(i, 1)
    }
  }
  const drain = (max = 500) => {
    for (let n = 0; q.length && n < max; n++) q.shift()!()
  }
  return { schedule, drain }
}

function started(seed = 3) {
  const w = world(seed)
  w.state = { ...w.state, profile: { ...w.state.profile, torches: 5 } }
  w.act({ type: 'run.start', floor: 1 })
  return w
}

describe('управление забегом', () => {
  it('путь идёт только по увиденному полу и обходит монстров', () => {
    const w = started()
    const r = w.state.run!
    for (let y = 0; y < r.map.length; y++)
      for (let x = 0; x < MAP_W; x++) {
        if (isWall(r.map, x, y) || !r.seen[y * MAP_W + x]) continue
        const p = findPath(r, x, y)
        if (!p) continue
        for (const [px, py] of p.slice(0, -1)) {
          expect(isWall(r.map, px, py)).toBe(false)
          expect(r.seen[py * MAP_W + px]).toBe(1)
          expect(r.mons.some((m) => m.x === px && m.y === py)).toBe(false)
        }
      }
  })

  it('автопуть доходит до клетки, ручной ввод его прерывает', () => {
    const w = started()
    const host = { run: () => w.state.run, dispatch: w.act }
    const { schedule, drain } = manual()
    const c = new Controller(host, schedule)
    const r = w.state.run!
    // самая дальняя видимая клетка пола без монстров
    let best: [number, number] | null = null
    let len = 0
    for (let y = 0; y < r.map.length; y++)
      for (let x = 0; x < MAP_W; x++) {
        const p = findPath(r, x, y)
        if (p && p.length > len && !r.mons.some((m) => m.x === x && m.y === y)) {
          len = p.length
          best = [x, y]
        }
      }
    expect(best).not.toBeNull()
    expect(c.walkTo(best![0], best![1])).toBe(true)
    expect(c.walking).toBe(true)
    drain()
    expect(c.walking).toBe(false)
    const after = w.state.run!
    // дошли, либо остановились из-за врага/урона/окна — но сдвинулись
    expect(after.px !== r.px || after.py !== r.py).toBe(true)

    c.walkTo(r.px, r.py)
    c.step(0, 0)
    expect(c.walking).toBe(false)
  })

  it('стена или неувиденная клетка — пути нет', () => {
    const w = started()
    const r = w.state.run!
    expect(findPath(r, 0, 0)).toBeNull()
  })
})
