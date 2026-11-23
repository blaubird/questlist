// Управление забегом без привязки к движку: шаги, автопуть по тапу, остановка при опасности.
// Используется и сценой Phaser (тап по клетке, клавиши), и кнопками React (крестовина с удержанием).
import { MAP_H, MAP_W } from '../core/config.ts'
import { computeVisible, isWall } from '../core/dungeon/fov.ts'
import type { Run } from '../core/dungeon/types.ts'
import type { Action, Result } from '../core/engine.ts'

export interface Host {
  run(): Run | null
  dispatch(a: Action): Result
}

export type Schedule = (fn: () => void, ms: number) => () => void

export const STEP_MS = 130

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

/** Id монстров, которых герой видит сейчас. */
export function visibleMonsters(r: Run): Set<number> {
  const vis = computeVisible(r.map, r.px, r.py, Array<number>(MAP_W * MAP_H).fill(0))
  return new Set(r.mons.filter((m) => vis[m.y * MAP_W + m.x]).map((m) => m.id))
}

/**
 * Кратчайший путь по увиденному полу (BFS). Монстры — препятствия, кроме цели:
 * если цель — монстр, путь заканчивается ударом по нему.
 */
export function findPath(r: Run, tx: number, ty: number): [number, number][] | null {
  if (tx === r.px && ty === r.py) return []
  if (isWall(r.map, tx, ty) || !r.seen[ty * MAP_W + tx]) return null
  const key = (x: number, y: number) => y * MAP_W + x
  const prev = new Map<number, number>([[key(r.px, r.py), -1]])
  const occupied = new Set(r.mons.map((m) => key(m.x, m.y)))
  const q: [number, number][] = [[r.px, r.py]]
  while (q.length) {
    const [x, y] = q.shift()!
    if (x === tx && y === ty) break
    for (const [dx, dy] of DIRS) {
      const nx = x + dx
      const ny = y + dy
      const k = key(nx, ny)
      if (prev.has(k) || isWall(r.map, nx, ny) || !r.seen[k]) continue
      if (occupied.has(k) && !(nx === tx && ny === ty)) continue
      prev.set(k, key(x, y))
      q.push([nx, ny])
    }
  }
  if (!prev.has(key(tx, ty))) return null
  const path: [number, number][] = []
  for (let k = key(tx, ty); k !== key(r.px, r.py); k = prev.get(k)!)
    path.push([k % MAP_W, Math.floor(k / MAP_W)])
  return path.reverse()
}

export class Controller {
  private stop: (() => void) | null = null
  private listeners = new Set<(walking: boolean) => void>()

  private host: Host
  private schedule: Schedule

  constructor(
    host: Host,
    schedule: Schedule = (fn, ms) => {
      const t = setTimeout(fn, ms)
      return () => clearTimeout(t)
    },
  ) {
    this.host = host
    this.schedule = schedule
  }

  get walking() {
    return this.stop !== null
  }

  onWalking(fn: (walking: boolean) => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private setStop(s: (() => void) | null) {
    const was = this.walking
    this.stop = s
    if (was !== this.walking) for (const fn of this.listeners) fn(this.walking)
  }

  cancel() {
    this.stop?.()
    this.setStop(null)
  }

  act(a: Action): Result {
    this.cancel()
    return this.host.dispatch(a)
  }

  step(dx: number, dy: number) {
    return this.act({ type: 'run.step', dx, dy })
  }

  /** Идти к клетке. Останавливается, если появился новый враг, герой получил урон или открылось окно. */
  walkTo(tx: number, ty: number): boolean {
    this.cancel()
    const r0 = this.host.run()
    if (!r0 || r0.over || r0.prompt) return false
    const path = findPath(r0, tx, ty)
    if (!path?.length) return false
    const seenAtStart = visibleMonsters(r0)
    let i = 0
    const tick = () => {
      const r = this.host.run()
      const next = path[i++]
      if (!r || r.over || r.prompt || !next) return this.setStop(null)
      const hp = r.hp
      const res = this.host.dispatch({ type: 'run.step', dx: next[0] - r.px, dy: next[1] - r.py })
      const after = this.host.run()
      if (!after || res.error || after.over || after.prompt) return this.setStop(null)
      const moved = after.px === next[0] && after.py === next[1]
      const attacked = res.fx.some((f) => f.t === 'attack' && f.who === 'hero')
      if (!moved && !attacked) return this.setStop(null)
      if (attacked) i-- // цель ещё жива — бьём снова, пока не умрёт или нас не ранят
      const newFoe = [...visibleMonsters(after)].some((id) => !seenAtStart.has(id))
      if (after.hp < hp || newFoe || i >= path.length) return this.setStop(null)
      this.setStop(this.schedule(tick, STEP_MS))
    }
    this.setStop(this.schedule(tick, 0))
    return true
  }
}
