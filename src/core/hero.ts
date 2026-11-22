// Характеристики героя и рост уровня.
import {
  ARMORS,
  ATK_BASE,
  ATK_LVL_DIV,
  DEF_LVL_DIV,
  ENH_ARMOR,
  ENH_WEAPON,
  HP_BASE,
  HP_PER_LVL,
  WEAPONS,
  XP_NEED_K,
  type GearTier,
} from './config.ts'

export const xpNeed = (lvl: number): number => Math.round(XP_NEED_K * lvl * lvl)

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

export interface HeroLike {
  lvl: number
  weapon: number
  armor: number
  wEnh: number
  aEnh: number
}

export interface HeroStats {
  maxHp: number
  atk: number
  def: number
}

export function heroStats(h: HeroLike): HeroStats {
  return {
    maxHp: HP_BASE + HP_PER_LVL * (h.lvl - 1),
    atk: ATK_BASE + Math.floor((h.lvl - 1) / ATK_LVL_DIV) + weaponTier(h.weapon).value + h.wEnh,
    def: Math.floor((h.lvl - 1) / DEF_LVL_DIV) + armorTier(h.armor).value + h.aEnh,
  }
}

/** Цена шага заточки n→n+1: [золото, осколки]. */
export function enhCost(weapon: boolean, n: number): { gold: number; shards: number } {
  const c = weapon ? ENH_WEAPON : ENH_ARMOR
  return { gold: c.gold * (n + 1), shards: c.shards * (n + 1) }
}
