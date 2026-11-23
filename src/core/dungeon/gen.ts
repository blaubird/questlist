// Генерация этажа. Детерминирована от rng.
import {
  AFFIX,
  ALTAR,
  FLOOR_MOD,
  SCALE_FROM,
  BOSS_CYCLE_MULT,
  BOSS_EVERY,
  BOSS_HP_PER_FLOOR,
  BOSSES,
  ELITE,
  ITEM_ODDS,
  ITEMS_COUNT,
  LEADER_DEEP_CHANCE,
  LEADER_DEEP_POOL,
  MAP_H,
  MAP_W,
  MON_COUNT,
  MONSTERS,
  MON_GROWTH,
  PACK_MAX,
  ROOM_H,
  ROOM_W,
  ROOMS_MAX,
  ROOMS_MIN,
  SPAWN_MIN_DIST,
  type FloorMod,
  type MonsterDef,
} from '../config.ts'
import { lootScale, monScale, over } from './scale.ts'
import type { Rng } from '../rng.ts'
import type { Floor, Item, Monster } from './types.ts'

interface Room {
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
}

const round1 = (v: number) => Math.round(v * 10) / 10

export function genFloor(f: number, rng: Rng, nextId: () => number): Floor {
  let grid: string[][]
  let rooms: Room[]
  do {
    grid = Array.from({ length: MAP_H }, () => Array<string>(MAP_W).fill('#'))
    rooms = []
    for (let i = 0; i < 120 && rooms.length < ROOMS_MAX; i++) {
      const w = rng.int(ROOM_W[0], ROOM_W[1])
      const h = rng.int(ROOM_H[0], ROOM_H[1])
      const x = 1 + rng.int(0, MAP_W - w - 3)
      const y = 1 + rng.int(0, MAP_H - h - 3)
      if (rooms.some((r) => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y))
        continue
      rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) })
    }
  } while (rooms.length < ROOMS_MIN)

  const set = (x: number, y: number) => {
    grid[y]![x] = '.'
  }
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) set(x, y)
  const hl = (x1: number, x2: number, y: number) => {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) set(x, y)
  }
  const vl = (y1: number, y2: number, x: number) => {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) set(x, y)
  }
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1]!
    const b = rooms[i]!
    if (rng.chance(0.5)) {
      hl(a.cx, b.cx, a.cy)
      vl(a.cy, b.cy, b.cx)
    } else {
      vl(a.cy, b.cy, a.cx)
      hl(a.cx, b.cx, b.cy)
    }
  }

  const occ = new Set<string>()
  const key = (x: number, y: number) => `${x},${y}`
  const first = rooms[0]!
  const last = rooms[rooms.length - 1]!
  const px = first.cx
  const py = first.cy
  occ.add(key(px, py))
  const stairs: [number, number] = [last.cx, last.cy]
  occ.add(key(stairs[0], stairs[1]))

  const spotIn = (r: Room): [number, number] | null => {
    for (let n = 0; n < 30; n++) {
      const x = r.x + rng.int(0, r.w - 1)
      const y = r.y + rng.int(0, r.h - 1)
      if (!occ.has(key(x, y)) && Math.abs(x - px) + Math.abs(y - py) >= SPAWN_MIN_DIST) {
        occ.add(key(x, y))
        return [x, y]
      }
    }
    return null
  }
  const otherRoom = () => rooms[1 + rng.int(0, rooms.length - 2)]!
  const spot = () => {
    for (let n = 0; n < 10; n++) {
      const p = spotIn(otherRoom())
      if (p) return p
    }
    return null
  }

  // Модификатор этажа — бросок только с FLOOR_MOD.fromFloor (ранние этажи генерируются как раньше).
  const mod: FloorMod | null =
    f >= FLOOR_MOD.fromFloor && rng.chance(FLOOR_MOD.chance) ? rng.pick(FLOOR_MOD.list) : null

  // Монстры
  const mm = modMults(mod)
  const make = (m: MonsterDef, x: number, y: number): Monster => monster(f, m, x, y, rng, nextId, mod)
  const pool = MONSTERS.filter((m) => m.minFloor <= f)
  const deep = pool.slice(-LEADER_DEEP_POOL)
  const mons: Monster[] = []
  const count = Math.min(
    Math.round(MON_COUNT.max * mm.count),
    Math.round((MON_COUNT.base + Math.floor(f * MON_COUNT.perFloor)) * mm.count),
  )
  for (let guard = 0; mons.length < count && guard < 60; guard++) {
    const room = otherRoom()
    const k = Math.min(count - mons.length, rng.int(1, PACK_MAX))
    const leader = rng.chance(LEADER_DEEP_CHANCE) ? rng.pick(deep) : rng.pick(pool)
    for (let i = 0; i < k; i++) {
      const p = spotIn(room)
      if (!p) break
      mons.push(make(i ? rng.pick(pool) : leader, p[0], p[1]))
    }
  }

  // Босс
  const bossFloor = f % BOSS_EVERY === 0
  if (bossFloor) {
    const n = f / BOSS_EVERY - 1
    const b = BOSSES[n % BOSSES.length]!
    const bm = 1 + BOSS_CYCLE_MULT * Math.floor(n / BOSSES.length)
    // Рядом с порталом: слева, сверху, справа, снизу — первая свободная клетка пола.
    const near: [number, number][] = [
      [stairs[0] - 1, stairs[1]],
      [stairs[0], stairs[1] - 1],
      [stairs[0] + 1, stairs[1]],
      [stairs[0], stairs[1] + 1],
    ]
    const free = near.find(([x, y]) => grid[y]?.[x] === '.' && !occ.has(key(x, y)))
    if (!free) {
      // Все соседи заняты монстрами — освобождаем первую клетку пола.
      const cell = near.find(([x, y]) => grid[y]?.[x] === '.')!
      const i = mons.findIndex((m) => m.x === cell[0] && m.y === cell[1])
      if (i >= 0) mons.splice(i, 1)
    }
    const [bx, by] = free ?? near.find(([x, y]) => grid[y]?.[x] === '.')!
    occ.add(key(bx, by))
    const hp = Math.round(b.hp * bm * (1 + BOSS_HP_PER_FLOOR * (f - BOSS_EVERY)) * MON_GROWTH.hp ** over(f))
    mons.push({
      id: nextId(),
      kind: b.id,
      name: b.name,
      hp,
      mhp: hp,
      atk: round1(b.atk * bm * MON_GROWTH.atk ** over(f)),
      xp: Math.round(b.xp * bm * MON_GROWTH.xp ** over(f)),
      x: bx,
      y: by,
      awake: false,
      boss: true,
      elite: false,
    })
  }

  // Предметы
  const items: Item[] = []
  const ni = rng.int(ITEMS_COUNT[0], ITEMS_COUNT[1])
  for (let i = 0; i < ni; i++) {
    const p = spot()
    if (!p) break
    const q = rng.next()
    const [x, y] = p
    const ls = lootScale(f)
    if (q < ITEM_ODDS.shard)
      items.push({ x, y, kind: 'shard', amount: Math.round((rng.int(1, 2) + Math.floor(f / 3)) * ls) })
    else if (q < ITEM_ODDS.shard + ITEM_ODDS.chest)
      items.push({ x, y, kind: 'chest', amount: Math.round((rng.int(3, 6) + f) * ls) })
    else if (q < ITEM_ODDS.shard + ITEM_ODDS.chest + ITEM_ODDS.meat)
      items.push({ x, y, kind: 'meat', amount: 0 })
    else items.push({ x, y, kind: 'potion', amount: 0 })
  }
  if (f >= ALTAR.fromFloor && rng.chance(ALTAR.chance)) {
    const p = spot()
    if (p) items.push({ x: p[0], y: p[1], kind: 'altar', amount: 0 })
  }

  return { map: grid.map((r) => r.join('')), px, py, stairs, mons, items, bossDead: !bossFloor, mod }
}

/** Множители модификатора этажа (1, если модификатора нет). */
export function modMults(mod: FloorMod | null | undefined) {
  return {
    count: mod === 'horde' ? FLOOR_MOD.horde.count : 1,
    loot: mod === 'horde' ? FLOOR_MOD.horde.loot : mod === 'rich' ? FLOOR_MOD.rich.loot : 1,
    hp: mod === 'rich' ? FLOOR_MOD.rich.hp : 1,
    atk: mod === 'frenzy' ? FLOOR_MOD.frenzy.atk : 1,
    xp: mod === 'frenzy' ? FLOOR_MOD.frenzy.xp : 1,
  }
}

/** Обычный монстр этажа f (элита — по шансу; свойство элиты — только глубже SCALE_FROM). */
export function monster(
  f: number,
  m: MonsterDef,
  x: number,
  y: number,
  rng: Rng,
  nextId: () => number,
  mod: FloorMod | null = null,
  canElite = true,
): Monster {
  const { hp: hm, atk: am, xp: xm } = monScale(f)
  const mm = modMults(mod)
  const elite = canElite && f >= ELITE.fromFloor && rng.chance(ELITE.chance)
  const affix = elite && f >= AFFIX.fromFloor && f > SCALE_FROM ? rng.pick(AFFIX.list) : null
  const hp = Math.round(m.hp * hm * mm.hp * (elite ? ELITE.hp : 1))
  return {
    id: nextId(),
    kind: m.id,
    name: (elite ? 'Элита · ' : '') + m.name + (affix ? ` (${AFFIX.name[affix]})` : ''),
    hp,
    mhp: hp,
    atk: round1(m.atk * am * mm.atk * (elite ? ELITE.atk : 1)),
    xp: Math.round(m.xp * xm * mm.xp * (elite ? ELITE.xp : 1)),
    x,
    y,
    awake: false,
    boss: false,
    elite,
    affix,
    shield: affix === 'shield' ? AFFIX.shieldCharges : 0,
  }
}
