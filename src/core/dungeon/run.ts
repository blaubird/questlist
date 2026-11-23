// Забег: ходы героя и монстров. Все функции получают копию забега и меняют её; случайность — из run.rng.
import {
  ALTAR,
  BOSS_SCROLL_CHANCE,
  CHECKPOINT_STEP,
  CRIT_CHANCE,
  CRIT_MULT,
  DESCEND_HEAL,
  ELITE,
  GREED_MAX,
  GREED_PER_DEPTH,
  HIT_SPREAD,
  LOOT,
  MAP_H,
  MAP_W,
  MEAT_HEAL,
  MON_MISS,
  POTION_FULL_SHARDS,
  POTION_HEAL,
  POTION_MAX,
  WAKE_FORGET_DIST,
  WHIRL,
} from '../config.ts'
import { addXp, heroStats, lootMult } from '../hero.ts'
import { createRng, type Rng } from '../rng.ts'
import { computeVisible, isWall } from './fov.ts'
import { genFloor } from './gen.ts'
import { lootScale } from './scale.ts'
import type { Fx, Monster, Run, RunHero } from './types.ts'

const LOG_MAX = 6
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

export const greed = (depth: number): number => Math.min(GREED_MAX, 1 + GREED_PER_DEPTH * depth)
export const runStats = (r: Run) => heroStats(r.hero)

/** Осколки с учётом глубины, Удачи и душ. */
const loot = (r: Run, base: number) => Math.max(1, Math.round(base * lootScale(r.f) * lootMult(r.hero)))

/** Доступные стартовые этажи: 1, 6, 11, … до чекпоинта. */
export function floorsOpen(checkpoint: number): number[] {
  const a: number[] = []
  for (let f = 1; f <= checkpoint; f += CHECKPOINT_STEP) a.push(f)
  return a
}

function say(r: Run, text: string) {
  r.log.unshift(text)
  if (r.log.length > LOG_MAX) r.log.length = LOG_MAX
}

/** Выполняет fn с ГПСЧ забега и сохраняет его состояние. */
function withRng<T>(r: Run, fn: (rng: Rng) => T): T {
  const rng = createRng(r.rng)
  const out = fn(rng)
  r.rng = rng.state()
  return out
}

function placeFloor(r: Run, f: number, rng: Rng) {
  const floor = genFloor(f, rng, () => r.nextId++)
  Object.assign(r, floor)
  r.f = f
  r.seen = Array<number>(MAP_W * MAP_H).fill(0)
  r.prompt = null
  computeVisible(r.map, r.px, r.py, r.seen)
}

export function startRun(o: { hero: RunHero; startFloor: number; seed: number; potions: number }): Run {
  const r: Run = {
    seed: o.seed,
    rng: o.seed,
    f: o.startFloor,
    startFloor: o.startFloor,
    hero: { ...o.hero },
    hp: heroStats(o.hero).maxHp,
    map: [],
    px: 0,
    py: 0,
    stairs: [0, 0],
    mons: [],
    items: [],
    bossDead: true,
    seen: [],
    shards: 0,
    xpGain: 0,
    kills: 0,
    potions: o.potions,
    potionsStart: o.potions,
    scrolls: 0,
    checkpoint: 0,
    depth: 0,
    cd: 0,
    turn: 0,
    nextId: 1,
    over: null,
    prompt: null,
    log: [],
  }
  withRng(r, (rng) => placeFloor(r, o.startFloor, rng))
  say(r, `Этаж ${o.startFloor}. Найди портал вниз.`)
  return r
}

function gainXp(r: Run, base: number, fx: Fx[]) {
  const amount = Math.round(base * lootMult(r.hero))
  const before = r.hero.lvl
  const next = addXp(r.hero.lvl, r.hero.xp, amount)
  r.hero.lvl = next.lvl
  r.hero.xp = next.xp
  r.xpGain += amount
  if (next.lvl > before) {
    r.hp = runStats(r).maxHp
    say(r, `Уровень ${next.lvl}! Здоровье восстановлено.`)
    fx.push({ t: 'levelup', lvl: next.lvl })
  }
}

function kill(r: Run, m: Monster, rng: Rng, fx: Fx[]) {
  if (!r.mons.includes(m)) return
  r.mons = r.mons.filter((x) => x !== m)
  r.kills++
  fx.push({ t: 'kill', id: m.id, x: m.x, y: m.y, boss: m.boss })
  say(r, `${m.name} повержен.`)
  gainXp(r, m.xp, fx)
  let sh = 0
  if (m.elite) sh = loot(r, 3 + Math.floor(r.f / 2))
  else if (rng.chance(LOOT.shardChance)) sh = loot(r, 1 + Math.floor(r.f / 4))
  if (sh) {
    r.shards += sh
    fx.push({ t: 'loot', x: m.x, y: m.y, amount: sh, kind: 'shard' })
  }
  if (rng.chance(LOOT.potionChance) && r.potions < POTION_MAX) {
    r.potions++
    say(r, 'Выпало зелье')
    fx.push({ t: 'loot', x: m.x, y: m.y, amount: 1, kind: 'potion' })
  }
  if ((m.elite && rng.chance(ELITE.scrollChance)) || (m.boss && rng.chance(BOSS_SCROLL_CHANCE))) {
    r.scrolls++
    say(r, 'Свиток призыва!')
    fx.push({ t: 'loot', x: m.x, y: m.y, amount: 1, kind: 'scroll' })
  }
  if (m.boss) {
    r.bossDead = true
    const a = loot(r, 5 + r.f)
    r.shards += a
    r.checkpoint = Math.max(r.checkpoint, r.f + 1)
    say(r, `Босс пал! +${a} осколков. Чекпоинт: этаж ${r.f + 1}.`)
  }
}

function hit(r: Run, m: Monster, dmg: number, kind: 'hit' | 'crit' | 'whirl', rng: Rng, fx: Fx[]) {
  m.hp -= dmg
  m.awake = true
  fx.push({ t: 'dmg', x: m.x, y: m.y, amount: dmg, kind })
  if (m.hp <= 0) kill(r, m, rng, fx)
}

function heroAttack(r: Run, m: Monster, rng: Rng, fx: Fx[]) {
  const crit = rng.chance(CRIT_CHANCE)
  let d = Math.max(1, Math.round(runStats(r).atk * rng.uniform(HIT_SPREAD[0], HIT_SPREAD[1])))
  if (crit) d *= CRIT_MULT
  fx.push({ t: 'attack', who: 'hero', dx: m.x - r.px, dy: m.y - r.py })
  say(r, `Ты бьёшь: ${m.name} −${d}${crit ? ' · крит!' : ''}`)
  hit(r, m, d, crit ? 'crit' : 'hit', rng, fx)
}

function pickup(r: Run, fx: Fx[]) {
  const i = r.items.findIndex((it) => it.x === r.px && it.y === r.py && it.kind !== 'altar')
  if (i < 0) return
  const it = r.items.splice(i, 1)[0]!
  const max = runStats(r).maxHp
  if (it.kind === 'shard' || it.kind === 'chest') {
    const a = Math.round(it.amount * lootMult(r.hero))
    r.shards += a
    say(r, `${it.kind === 'chest' ? 'Сундук' : 'Осколки'}: +${a}`)
    fx.push({ t: 'loot', x: r.px, y: r.py, amount: a, kind: 'shard' })
  } else if (it.kind === 'meat') {
    const h = Math.round(max * MEAT_HEAL)
    r.hp = Math.min(max, r.hp + h)
    say(r, `Жаркое: +${h} здоровья`)
    fx.push({ t: 'heal', x: r.px, y: r.py, amount: h })
  } else if (it.kind === 'potion') {
    if (r.potions < POTION_MAX) {
      r.potions++
      say(r, 'Нашёл зелье')
      fx.push({ t: 'loot', x: r.px, y: r.py, amount: 1, kind: 'potion' })
    } else {
      const a = loot(r, POTION_FULL_SHARDS)
      r.shards += a
      say(r, `Сумка полна — зелье ушло за ${a} осколков`)
    }
  }
}

function monstersTurn(r: Run, vis: Uint8Array, rng: Rng, fx: Fx[]) {
  const def = runStats(r).def
  for (const m of r.mons) {
    if (r.over) break
    if (!m.awake && vis[m.y * MAP_W + m.x]) m.awake = true
    if (!m.awake) continue
    const dist = Math.abs(m.x - r.px) + Math.abs(m.y - r.py)
    if (dist === 1) {
      fx.push({ t: 'attack', who: m.id, dx: r.px - m.x, dy: r.py - m.y })
      if (rng.chance(MON_MISS)) {
        say(r, `${m.name} промахивается`)
        fx.push({ t: 'miss', x: r.px, y: r.py })
        continue
      }
      const d = Math.max(1, Math.round(m.atk * rng.uniform(HIT_SPREAD[0], HIT_SPREAD[1])) - def)
      r.hp -= d
      say(r, `${m.name} бьёт тебя: −${d}`)
      fx.push({ t: 'dmg', x: r.px, y: r.py, amount: d, kind: 'hurt' }, { t: 'shake' })
      if (r.hp <= 0) {
        r.hp = 0
        r.over = 'dead'
      }
      continue
    }
    if (dist > WAKE_FORGET_DIST) {
      m.awake = false
      continue
    }
    let best: [number, number] | null = null
    let bestD = dist
    for (const [dx, dy] of DIRS) {
      const x = m.x + dx
      const y = m.y + dy
      if (isWall(r.map, x, y) || (x === r.px && y === r.py)) continue
      if (r.mons.some((o) => o !== m && o.x === x && o.y === y)) continue
      const d = Math.abs(x - r.px) + Math.abs(y - r.py)
      if (d < bestD) {
        bestD = d
        best = [x, y]
      }
    }
    if (best) {
      fx.push({ t: 'move', who: m.id, fx: m.x, fy: m.y, x: best[0], y: best[1] })
      m.x = best[0]
      m.y = best[1]
    }
  }
}

function endTurn(r: Run, rng: Rng, fx: Fx[]) {
  monstersTurn(r, computeVisible(r.map, r.px, r.py, r.seen), rng, fx)
  computeVisible(r.map, r.px, r.py, r.seen)
  if (r.cd > 0) r.cd--
  r.turn++
}

const canAct = (r: Run) => !r.over && !r.prompt

/** Шаг (или атака) в направлении; (0,0) — ждать. */
export function runStep(r: Run, dx: number, dy: number): Fx[] {
  const fx: Fx[] = []
  if (!canAct(r)) return fx
  if (Math.abs(dx) + Math.abs(dy) > 1) return fx
  withRng(r, (rng) => {
    let onStairs = false
    let altar = false
    if (dx === 0 && dy === 0) say(r, 'Ты ждёшь и прислушиваешься.')
    else {
      const nx = r.px + dx
      const ny = r.py + dy
      if (isWall(r.map, nx, ny)) return
      const m = r.mons.find((o) => o.x === nx && o.y === ny)
      if (m) heroAttack(r, m, rng, fx)
      else {
        fx.push({ t: 'move', who: 'hero', fx: r.px, fy: r.py, x: nx, y: ny })
        r.px = nx
        r.py = ny
        pickup(r, fx)
        onStairs = nx === r.stairs[0] && ny === r.stairs[1]
        altar = r.items.some((it) => it.kind === 'altar' && it.x === nx && it.y === ny)
      }
    }
    endTurn(r, rng, fx)
    if (r.over) return
    if (onStairs) {
      if (!r.bossDead) say(r, 'Портал запечатан. Сначала победи босса.')
      else r.prompt = { kind: 'stairs' }
    } else if (altar) r.prompt = { kind: 'altar', x: r.px, y: r.py }
  })
  return fx
}

export function runWhirl(r: Run): Fx[] {
  const fx: Fx[] = []
  if (!canAct(r)) return fx
  if (r.cd > 0) {
    say(r, `Вихрь перезаряжается: ${r.cd} ход.`)
    return fx
  }
  const targets = r.mons.filter((m) => Math.abs(m.x - r.px) <= 1 && Math.abs(m.y - r.py) <= 1)
  if (!targets.length) {
    say(r, 'Рядом нет врагов для вихря.')
    return fx
  }
  withRng(r, (rng) => {
    say(r, `Вихрь клинков! Задето врагов: ${targets.length}`)
    fx.push({ t: 'whirl' })
    const atk = runStats(r).atk
    for (const m of targets) {
      hit(
        r,
        m,
        Math.max(1, Math.round(atk * WHIRL.mult * rng.uniform(WHIRL.spread[0], WHIRL.spread[1]))),
        'whirl',
        rng,
        fx,
      )
    }
    r.cd = WHIRL.cooldown
    endTurn(r, rng, fx)
  })
  return fx
}

export function runPotion(r: Run): Fx[] {
  const fx: Fx[] = []
  if (!canAct(r)) return fx
  const max = runStats(r).maxHp
  if (r.potions < 1) {
    say(r, 'Зелий нет. Купи в лавке за осколки.')
    return fx
  }
  if (r.hp >= max) {
    say(r, 'Ты и так здоров.')
    return fx
  }
  withRng(r, (rng) => {
    r.potions--
    const h = Math.round(max * POTION_HEAL)
    r.hp = Math.min(max, r.hp + h)
    say(r, `Зелье: +${h} здоровья`)
    fx.push({ t: 'heal', x: r.px, y: r.py, amount: h })
    endTurn(r, rng, fx)
  })
  return fx
}

/** Портал: глубже. */
export function runDescend(r: Run): Fx[] {
  const fx: Fx[] = []
  if (r.over || r.prompt?.kind !== 'stairs') return fx
  const max = runStats(r).maxHp
  r.hp = Math.min(max, r.hp + Math.round(max * DESCEND_HEAL))
  r.depth++
  withRng(r, (rng) => placeFloor(r, r.f + 1, rng))
  say(r, r.f % 5 === 0 ? `Этаж ${r.f}. Здесь логово босса…` : `Этаж ${r.f}. Глубже и темнее.`)
  fx.push({ t: 'floor', f: r.f })
  return fx
}

/** Алтарь крови: принять (отдать 30% здоровья) или уйти. */
export function runAltar(r: Run, accept: boolean): Fx[] {
  const fx: Fx[] = []
  const p = r.prompt
  if (r.over || p?.kind !== 'altar') return fx
  r.prompt = null
  if (!accept) return fx
  const cost = Math.round(runStats(r).maxHp * ALTAR.hpCost)
  if (r.hp <= cost) return fx
  const gain = loot(r, 5 + r.f)
  r.hp -= cost
  r.shards += gain
  r.depth += ALTAR.depth
  r.items = r.items.filter((it) => !(it.kind === 'altar' && it.x === p.x && it.y === p.y))
  say(r, `Алтарь принял жертву: +${gain} осколков, множитель ×${greed(r.depth)}`)
  fx.push({ t: 'loot', x: r.px, y: r.py, amount: gain, kind: 'shard' }, { t: 'shake' })
  return fx
}

/** Закрыть окно портала, не уходя (остаться на этаже). */
export function runDismiss(r: Run) {
  if (r.prompt?.kind === 'stairs') r.prompt = null
}

export function altarCost(r: Run): number {
  return Math.round(runStats(r).maxHp * ALTAR.hpCost)
}
