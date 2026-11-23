// Характеристики героя и рост уровня.
import {
  ARMORS,
  ATK_BASE,
  ATK_LVL_DIV,
  BLESS,
  CHECKPOINT_STEP,
  DEF_LVL_DIV,
  ENH_ARMOR,
  ENH_OVER,
  ENH_SOFT,
  ENH_WEAPON,
  HP_BASE,
  HP_PER_LVL,
  SCALE_FROM,
  SOULS,
  LVL_MULT,
  WEAPONS,
  XP_GROWTH,
  XP_NEED_K,
  XP_SOFT,
  type BlessTrack,
  type GearTier,
} from './config.ts'

export const xpNeed = (lvl: number): number =>
  Math.round(XP_NEED_K * Math.min(lvl, XP_SOFT) ** 2 * XP_GROWTH ** Math.max(0, lvl - XP_SOFT))

/** Прибавляет опыт: возвращает новый уровень и остаток опыта. */
export function addXp(lvl: number, xp: number, gain: number): { lvl: number; xp: number } {
  let l = lvl
  let x = xp + gain
  while (x >= xpNeed(l)) {
    x -= xpNeed(l)
    l++
  }
  return { lvl: l, xp: x }
}

export const weaponTier = (i: number): GearTier => WEAPONS[Math.min(i, WEAPONS.length - 1)]!
export const armorTier = (i: number): GearTier => ARMORS[Math.min(i, ARMORS.length - 1)]!
export const gearComplete = (h: { weapon: number; armor: number }): boolean =>
  h.weapon >= WEAPONS.length - 1 && h.armor >= ARMORS.length - 1

export interface HeroLike {
  lvl: number
  weapon: number
  armor: number
  wEnh: number
  aEnh: number
  blessAtk: number
  blessVit: number
  blessLoot: number
  souls: number
}

export const pickHero = (p: HeroLike): HeroLike => ({
  lvl: p.lvl,
  weapon: p.weapon,
  armor: p.armor,
  wEnh: p.wEnh,
  aEnh: p.aEnh,
  blessAtk: p.blessAtk,
  blessVit: p.blessVit,
  blessLoot: p.blessLoot,
  souls: p.souls,
})

export interface HeroStats {
  maxHp: number
  atk: number
  def: number
}

/** Множитель заточки выше мягкого потолка. */
const overEnh = (n: number) => ENH_OVER.mult ** Math.max(0, n - ENH_SOFT)
export const soulMult = (souls: number) => 1 + SOULS.perSoul * souls

export function heroStats(h: HeroLike): HeroStats {
  const soul = soulMult(h.souls) * LVL_MULT ** Math.max(0, h.lvl - XP_SOFT)
  const vit = BLESS.mult ** h.blessVit * overEnh(h.aEnh) * soul
  // Линейные прибавки прототипа — только до мягких потолков; дальше рост идёт множителями.
  const lvl = Math.min(h.lvl, XP_SOFT)
  const baseAtk =
    ATK_BASE + Math.floor((lvl - 1) / ATK_LVL_DIV) + weaponTier(h.weapon).value + Math.min(h.wEnh, ENH_SOFT)
  const baseDef = Math.floor((lvl - 1) / DEF_LVL_DIV) + armorTier(h.armor).value + Math.min(h.aEnh, ENH_SOFT)
  return {
    maxHp: Math.round((HP_BASE + HP_PER_LVL * (lvl - 1)) * vit),
    atk: baseAtk * BLESS.mult ** h.blessAtk * overEnh(h.wEnh) * soul,
    def: baseDef * vit,
  }
}

/** Множитель добычи осколков и опыта от благословения Удачи и душ. */
export const lootMult = (h: Pick<HeroLike, 'blessLoot' | 'souls'>): number =>
  BLESS.mult ** h.blessLoot * (1 + SOULS.lootPerSoul * h.souls)

/** Цена шага заточки n→n+1. До ENH_SOFT — как в прототипе, дальше — только осколки, экспоненциально. */
export function enhCost(weapon: boolean, n: number): { gold: number; shards: number } {
  const c = weapon ? ENH_WEAPON : ENH_ARMOR
  if (n < ENH_SOFT) return { gold: c.gold * (n + 1), shards: c.shards * (n + 1) }
  return { gold: 0, shards: Math.round(c.shards * ENH_SOFT * ENH_OVER.costGrowth ** (n - ENH_SOFT + 1)) }
}

export const blessCost = (level: number): number => BLESS.baseCost + BLESS.costPerLevel * level

const BLESS_KEYS = { atk: 'blessAtk', vit: 'blessVit', loot: 'blessLoot' } as const
export const blessKey = (t: BlessTrack) => BLESS_KEYS[t]

/** Всего душ за чекпоинт: только за рекорды после ранней игры (чекпоинт > SCALE_FROM + 1). */
export const soulsFor = (checkpoint: number): number =>
  checkpoint <= SCALE_FROM + 1 ? 0 : Math.floor((checkpoint - SCALE_FROM - 1) / CHECKPOINT_STEP)
