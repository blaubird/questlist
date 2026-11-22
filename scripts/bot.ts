// Бот баланса — перенос reference/balance-bot.js на src/core.
// Каждый день: 5 задач (3 средние, 1 лёгкая, 1 тяжёлая), жадные покупки, все факелы в подземелье.
import { ARMORS, MAP_W, WEAPONS } from '../src/core/config.ts'
import { floorsOpen, runStats } from '../src/core/dungeon/run.ts'
import type { Run } from '../src/core/dungeon/types.ts'
import { apply, type Action, type Ctx } from '../src/core/engine.ts'
import { enhCost, heroStats } from '../src/core/hero.ts'
import { createRng } from '../src/core/rng.ts'
import { freshState, type GameState } from '../src/core/state.ts'

export interface DayRow {
  d: number
  lvl: number
  w: number
  a: number
  we: number
  ae: number
  maxf: number
  best: number
  cp: number
  deaths: number
  runs: number
  gold: number
  shards: number
  scrolls: number
  atk: number
  def: number
  hp: number
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

const dayStr = (base: number, d: number) => new Date(base + d * 86_400_000).toISOString().slice(0, 10)

/** Ход бота внутри забега (как step() в reference/balance-bot.js). */
function botAction(r: Run): Action {
  const max = runStats(r).maxHp
  if (r.hp < max * 0.35 && r.potions > 0 && r.hp < max) return { type: 'run.potion' }
  const seen = (x: number, y: number) => r.seen[y * MAP_W + x] === 1
  const wall = (x: number, y: number) => r.map[y]?.[x] !== '.'
  const monAt = (x: number, y: number) => r.mons.some((m) => m.x === x && m.y === y)
  const goal = (x: number, y: number) => {
    if (monAt(x, y) && seen(x, y)) return true
    return r.items.some((i) => i.x === x && i.y === y && seen(x, y) && i.kind !== 'altar')
  }
  const k = (x: number, y: number) => `${x},${y}`
  const prev = new Map<string, [number, number] | null>([[k(r.px, r.py), null]])
  const q: [number, number][] = [[r.px, r.py]]
  let best: [number, number] | null = null
  let stairs: [number, number] | null = null
  let frontier: [number, number] | null = null
  while (q.length) {
    const [x, y] = q.shift()!
    const self = x === r.px && y === r.py
    if (!self && goal(x, y)) {
      best = [x, y]
      break
    }
    if (!stairs && !self && x === r.stairs[0] && y === r.stairs[1]) stairs = [x, y]
    if (!frontier && DIRS.some(([dx, dy]) => !seen(x + dx, y + dy) && !wall(x + dx, y + dy)))
      frontier = [x, y]
    if (!self && monAt(x, y)) continue
    for (const [dx, dy] of DIRS) {
      const nx = x + dx
      const ny = y + dy
      if (prev.has(k(nx, ny)) || wall(nx, ny) || !seen(nx, ny)) continue
      prev.set(k(nx, ny), [x, y])
      q.push([nx, ny])
    }
  }
  const tgt = best ?? (r.bossDead ? stairs : null) ?? frontier ?? stairs
  if (!tgt) return { type: 'run.step', dx: 0, dy: 0 }
  let c = tgt
  for (;;) {
    const p = prev.get(k(c[0], c[1]))
    if (!p || (p[0] === r.px && p[1] === r.py)) break
    c = p
  }
  return { type: 'run.step', dx: c[0] - r.px, dy: c[1] - r.py }
}

export function simulate(days: number, seed = 1): DayRow[] {
  const rng = createRng(seed)
  let n = 0
  const base = Date.UTC(2026, 0, 1)
  let state: GameState = freshState(dayStr(base, 0))
  let now = base + 9 * 3_600_000
  let day = dayStr(base, 0)
  let yesterday = dayStr(base, -1)
  const ctx = (): Ctx => ({ now, day, yesterday, rng, dev: 'bot', newId: () => `b${++n}` })
  const act = (a: Action) => {
    const res = apply(state, a, ctx())
    state = res.state
    return res
  }
  const out: DayRow[] = []

  for (let d = 1; d <= days; d++) {
    day = dayStr(base, d)
    yesterday = dayStr(base, d - 1)
    now = Date.parse(`${day}T09:00:00Z`)
    // Задачи
    for (const diff of ['m', 'm', 'm', 'e', 'h'] as const) {
      const add = act({ type: 'task.add', title: 'бот', diff, daily: false })
      now += 10 * 60_000
      act({ type: 'task.complete', id: (add.info as { id: string }).id })
    }
    // Покупки
    for (let bought = true; bought;) {
      bought = false
      const p = state.profile
      const wn = WEAPONS[p.weapon + 1]?.cost ?? Infinity
      const an = ARMORS[p.armor + 1]?.cost ?? Infinity
      if (Math.min(wn, an) <= p.gold) {
        act(
          wn <= an ? { type: 'shop.weapon', tier: p.weapon + 1 } : { type: 'shop.armor', tier: p.armor + 1 },
        )
        bought = true
      }
      const q = state.profile
      const we = enhCost(true, q.wEnh)
      if (q.wEnh < 10 && q.gold >= we.gold + 30 && q.shards >= we.shards) {
        act({ type: 'shop.enhance', weapon: true })
        bought = true
      }
      const s = state.profile
      const ae = enhCost(false, s.aEnh)
      if (s.aEnh < 10 && s.gold >= ae.gold + 30 && s.shards >= ae.shards) {
        act({ type: 'shop.enhance', weapon: false })
        bought = true
      }
    }
    while (state.profile.potions < 3 && state.profile.shards >= 12) act({ type: 'shop.potion' })
    // Подземелье
    let deaths = 0
    let maxf = 0
    let runs = 0
    while (state.profile.torches > 0) {
      const fo = floorsOpen(state.profile.checkpoint)
      act({ type: 'run.start', floor: fo[fo.length - 1]! })
      runs++
      for (let steps = 0; state.run && steps < 4000; steps++) {
        const r: Run = state.run
        now += 1000
        if (r.over === 'dead') {
          deaths++
          maxf = Math.max(maxf, r.f)
          act({ type: 'run.finish' })
          break
        }
        const max = runStats(r).maxHp
        if (r.prompt?.kind === 'altar') {
          act({ type: 'run.altar', accept: r.hp > max * 0.6 && r.hp > Math.round(max * 0.3) })
          continue
        }
        if (r.prompt?.kind === 'stairs') {
          if (r.hp > max * 0.5 || r.potions > 0) act({ type: 'run.descend' })
          else {
            maxf = Math.max(maxf, r.f)
            act({ type: 'run.leave' })
          }
          continue
        }
        if (
          r.cd === 0 &&
          r.mons.filter((m) => Math.abs(m.x - r.px) <= 1 && Math.abs(m.y - r.py) <= 1).length >= 2
        ) {
          act({ type: 'run.whirl' })
          continue
        }
        act(botAction(r))
      }
      if (state.run) {
        // застрял — засчитываем этаж и выходим без добычи
        maxf = Math.max(maxf, state.run.f)
        state = { ...state, run: null }
      }
    }
    const p = state.profile
    const st = heroStats(p)
    out.push({
      d,
      lvl: p.lvl,
      w: p.weapon,
      a: p.armor,
      we: p.wEnh,
      ae: p.aEnh,
      maxf,
      best: p.best,
      cp: p.checkpoint,
      deaths,
      runs,
      gold: p.gold,
      shards: p.shards,
      scrolls: p.scrolls,
      atk: st.atk,
      def: st.def,
      hp: st.maxHp,
    })
  }
  return out
}
