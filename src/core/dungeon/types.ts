import type { BossId, MonsterId } from '../config.ts'
import type { HeroLike } from '../hero.ts'

export interface Monster {
  /** Уникален в пределах забега — для анимаций. */
  id: number
  kind: MonsterId | BossId
  name: string
  hp: number
  mhp: number
  atk: number
  xp: number
  x: number
  y: number
  awake: boolean
  boss: boolean
  elite: boolean
}

export type ItemKind = 'shard' | 'chest' | 'meat' | 'potion' | 'altar'

export interface Item {
  x: number
  y: number
  kind: ItemKind
  amount: number
}

export interface Floor {
  /** MAP_H строк по MAP_W символов: '#' стена, '.' пол. */
  map: string[]
  px: number
  py: number
  stairs: [number, number]
  mons: Monster[]
  items: Item[]
  bossDead: boolean
}

export type Prompt = { kind: 'stairs' } | { kind: 'altar'; x: number; y: number } | null

export interface RunHero extends HeroLike {
  xp: number
}

export interface Run extends Floor {
  seed: number
  /** Состояние ГПСЧ забега. */
  rng: number
  f: number
  startFloor: number
  /** Герой на время забега: снаряжение с начала забега, уровень растёт. */
  hero: RunHero
  hp: number
  /** 0/1 на каждую клетку — увиденные. */
  seen: number[]
  shards: number
  xpGain: number
  kills: number
  potions: number
  potionsStart: number
  scrolls: number
  checkpoint: number
  depth: number
  cd: number
  turn: number
  nextId: number
  over: null | 'dead'
  prompt: Prompt
  log: string[]
}

/** Визуальная обратная связь для слоя графики. Не сохраняется. */
export type Fx =
  | { t: 'move'; who: 'hero' | number; fx: number; fy: number; x: number; y: number }
  | { t: 'attack'; who: 'hero' | number; dx: number; dy: number }
  | { t: 'dmg'; x: number; y: number; amount: number; kind: 'hit' | 'crit' | 'whirl' | 'hurt' }
  | { t: 'miss'; x: number; y: number }
  | { t: 'heal'; x: number; y: number; amount: number }
  | { t: 'loot'; x: number; y: number; amount: number; kind: 'shard' | 'potion' | 'scroll' }
  | { t: 'kill'; id: number; x: number; y: number; boss: boolean }
  | { t: 'levelup'; lvl: number }
  | { t: 'whirl' }
  | { t: 'shake' }
  | { t: 'floor'; f: number }
