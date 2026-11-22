// Все числа баланса — именованные константы. Источник: docs/GAME_SPEC.md (ранняя игра, как в прототипе)
// и docs/PROGRESSION.md (масштаб). Менять только вместе с прогоном `pnpm sim`.

export const START = {
  gold: 30,
  torches: 1,
  potions: 2,
  skin: 'mage',
} as const

// ---------- Задачи и экономика ----------
export type Difficulty = 'e' | 'm' | 'h'
export const DIFF: Record<Difficulty, { name: string; gold: number; torches: number }> = {
  e: { name: 'Лёгкая', gold: 10, torches: 1 },
  m: { name: 'Средняя', gold: 25, torches: 1 },
  h: { name: 'Тяжёлая', gold: 60, torches: 2 },
}
export const QUICK_MS = 3 * 60 * 1000
export const STREAK_DAY_TASKS = 3
export const STREAK_BONUS_PER_DAY = 0.05
export const STREAK_BONUS_MAX = 0.5
export const GOLD_CAP = 400
export const GOLD_OVER_CAP_RATE = 0.25
export const TORCH_CAP = 10
export const UNDO_MS = 7000

// ---------- Герой ----------
export const XP_NEED_K = 20 // need(L) = round(20·L²)
export const HP_BASE = 24
export const HP_PER_LVL = 5
export const ATK_BASE = 3
export const ATK_LVL_DIV = 2
export const DEF_LVL_DIV = 4

export interface GearTier {
  name: string
  value: number
  cost: number
}
export const WEAPONS: readonly GearTier[] = [
  { name: 'Палка', value: 0, cost: 0 },
  { name: 'Кинжал', value: 3, cost: 60 },
  { name: 'Меч', value: 7, cost: 200 },
  { name: 'Топор', value: 12, cost: 500 },
  { name: 'Боевой молот', value: 18, cost: 1100 },
  { name: 'Трезубец бездны', value: 26, cost: 2400 },
]
export const ARMORS: readonly GearTier[] = [
  { name: 'Лохмотья', value: 0, cost: 0 },
  { name: 'Кожанка', value: 2, cost: 80 },
  { name: 'Кольчуга', value: 4, cost: 250 },
  { name: 'Латы', value: 7, cost: 600 },
  { name: 'Мифрил', value: 10, cost: 1400 },
]
/** Заточка оружия: шаг n→n+1 стоит [gold·(n+1), shards·(n+1)]. */
export const ENH_WEAPON = { gold: 15, shards: 8 } as const
export const ENH_ARMOR = { gold: 20, shards: 10 } as const
export const ENH_MAX = 25

export const POTION_COST = 12
export const POTION_MAX = 5
export const POTION_HEAL = 0.5

// ---------- Подземелье ----------
export const MAP_W = 32
export const MAP_H = 24
export const ROOMS_MIN = 5
export const ROOMS_MAX = 9
export const ROOM_W = [4, 8] as const
export const ROOM_H = [4, 6] as const
export const FOV_R2 = 42
export const FLOORS_PER_BIOME = 5
export const CHECKPOINT_STEP = 5

export type MonsterId =
  'rat' | 'bat' | 'spider' | 'goblin' | 'skeleton' | 'wolf' | 'zombie' | 'snake' | 'ogre' | 'ghost' | 'demon'
export type BossId = 'scorpion' | 'troll' | 'lich' | 'dragon'

export interface MonsterDef {
  id: MonsterId
  name: string
  hp: number
  atk: number
  xp: number
  minFloor: number
}
export const MONSTERS: readonly MonsterDef[] = [
  { id: 'rat', name: 'Крыса', hp: 6, atk: 2, xp: 3, minFloor: 1 },
  { id: 'bat', name: 'Летучая мышь', hp: 5, atk: 3, xp: 3, minFloor: 1 },
  { id: 'spider', name: 'Паук', hp: 9, atk: 3, xp: 5, minFloor: 2 },
  { id: 'goblin', name: 'Гоблин', hp: 12, atk: 4, xp: 7, minFloor: 3 },
  { id: 'skeleton', name: 'Скелет', hp: 15, atk: 5, xp: 9, minFloor: 4 },
  { id: 'wolf', name: 'Волк', hp: 14, atk: 6, xp: 10, minFloor: 5 },
  { id: 'zombie', name: 'Зомби', hp: 24, atk: 5, xp: 12, minFloor: 6 },
  { id: 'snake', name: 'Змей', hp: 18, atk: 8, xp: 14, minFloor: 8 },
  { id: 'ogre', name: 'Огр', hp: 36, atk: 9, xp: 20, minFloor: 10 },
  { id: 'ghost', name: 'Призрак', hp: 26, atk: 11, xp: 22, minFloor: 12 },
  { id: 'demon', name: 'Демон', hp: 44, atk: 13, xp: 30, minFloor: 15 },
]
export const BOSSES: readonly { id: BossId; name: string; hp: number; atk: number; xp: number }[] = [
  { id: 'scorpion', name: 'Скорпион-владыка', hp: 46, atk: 6, xp: 45 },
  { id: 'troll', name: 'Пещерный тролль', hp: 80, atk: 9, xp: 90 },
  { id: 'lich', name: 'Лич', hp: 110, atk: 12, xp: 150 },
  { id: 'dragon', name: 'Древний дракон', hp: 160, atk: 15, xp: 240 },
]

/** Масштаб монстров по этажу f (ранняя игра): hp ×(1+0,12(f−1)), atk ×(1+0,08(f−1)), xp ×(1+0,05(f−1)). */
export const MON_SCALE = { hp: 0.12, atk: 0.08, xp: 0.05 } as const
export const MON_COUNT = { base: 6, perFloor: 0.8, max: 20 } as const
export const PACK_MAX = 3
export const SPAWN_MIN_DIST = 5
export const LEADER_DEEP_CHANCE = 0.6
export const LEADER_DEEP_POOL = 5

export const ELITE = { fromFloor: 2, chance: 0.15, hp: 2, atk: 1.35, xp: 2.5, scrollChance: 0.03 } as const
export const BOSS_EVERY = 5
export const BOSS_CYCLE_MULT = 0.6
export const BOSS_HP_PER_FLOOR = 0.05
export const BOSS_SCROLL_CHANCE = 0.3

export const ITEMS_COUNT = [4, 6] as const
export const ITEM_ODDS = { shard: 0.4, chest: 0.22, meat: 0.2, potion: 0.18 } as const
export const MEAT_HEAL = 0.3
export const POTION_FULL_SHARDS = 3
export const ALTAR = { fromFloor: 2, chance: 0.35, hpCost: 0.3, depth: 2 } as const

// ---------- Бой ----------
export const HIT_SPREAD = [0.8, 1.2] as const
export const CRIT_CHANCE = 0.12
export const CRIT_MULT = 2
export const MON_MISS = 0.08
export const WAKE_FORGET_DIST = 12
export const LOOT = { shardChance: 0.55, potionChance: 0.06 } as const
export const WHIRL = { mult: 1.3, spread: [0.85, 1.15] as const, cooldown: 6 } as const
export const DESCEND_HEAL = 0.15
export const GREED_PER_DEPTH = 0.25
export const GREED_MAX = 3

// ---------- Казино ----------
export const BETS = [10, 25, 50, 100] as const
export type SlotSymbol = 'skull' | 'candle' | 'goblet' | 'crown' | 'eye'
export const SLOT_WEIGHTS: readonly (readonly [SlotSymbol, number])[] = [
  ['skull', 5],
  ['candle', 4],
  ['goblet', 3],
  ['crown', 2],
  ['eye', 1],
]
export const SLOT_PAY: Record<SlotSymbol, number> = { skull: 5, candle: 10, goblet: 20, crown: 50, eye: 200 }
/** Ровно два черепа — ставка возвращается. */
export const SLOT_TWO_SKULLS = 1
export const ROULETTE_REDS: readonly number[] = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]
export const ROULETTE_COLOR_PAY = 2
export const ROULETTE_ZERO_PAY = 36
export const CHEST_COST = 150
export const CHEST_DUP_SHARDS = 12
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export const CHEST_ODDS: readonly (readonly [Rarity, number])[] = [
  ['common', 0.6],
  ['rare', 0.28],
  ['epic', 0.1],
  ['legendary', 0.02],
]
