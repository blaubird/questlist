// Рост чисел по глубине после SCALE_FROM (docs/PROGRESSION.md).
import { LOOT_GROWTH, MON_GROWTH, MON_SCALE, SCALE_FROM } from '../config.ts'

/** Сколько этажей прошло после начала экспоненциального роста. */
export const over = (f: number): number => Math.max(0, f - SCALE_FROM)

/** Множитель добычи осколков на этаже f. */
export const lootScale = (f: number): number => LOOT_GROWTH ** over(f)

/** Множители обычных монстров на этаже f: линейный рост прототипа × экспонента после SCALE_FROM. */
export function monScale(f: number): { hp: number; atk: number; xp: number } {
  return {
    hp: (1 + MON_SCALE.hp * (f - 1)) * MON_GROWTH.hp ** over(f),
    atk: (1 + MON_SCALE.atk * (f - 1)) * MON_GROWTH.atk ** over(f),
    xp: (1 + MON_SCALE.xp * (f - 1)) * MON_GROWTH.xp ** over(f),
  }
}
