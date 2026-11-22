// Казино: только игровое золото, отрицательное матожидание для игрока.
import {
  CHEST_ODDS,
  ROULETTE_COLOR_PAY,
  ROULETTE_REDS,
  ROULETTE_ZERO_PAY,
  SLOT_PAY,
  SLOT_TWO_SKULLS,
  SLOT_WEIGHTS,
  type Rarity,
  type SlotSymbol,
} from './config.ts'
import type { Rng } from './rng.ts'
import { SKIN_POOL } from './skins.ts'

const SLOT_TOTAL = SLOT_WEIGHTS.reduce((s, [, w]) => s + w, 0)

export function reelSymbol(rng: Rng): SlotSymbol {
  let n = rng.next() * SLOT_TOTAL
  for (const [s, w] of SLOT_WEIGHTS) if ((n -= w) < 0) return s
  return SLOT_WEIGHTS[0]![0]
}

/** Множитель выплаты для комбинации. */
export function slotMultiplier(reels: readonly SlotSymbol[]): number {
  const [a, b, c] = reels
  if (a === b && b === c && a) return SLOT_PAY[a]
  if (reels.filter((s) => s === 'skull').length === 2) return SLOT_TWO_SKULLS
  return 0
}

/** Точный RTP слотов перебором всех комбинаций. */
export function slotRtp(): number {
  let ev = 0
  for (const [a, wa] of SLOT_WEIGHTS)
    for (const [b, wb] of SLOT_WEIGHTS)
      for (const [c, wc] of SLOT_WEIGHTS) ev += ((wa * wb * wc) / SLOT_TOTAL ** 3) * slotMultiplier([a, b, c])
  return ev
}

export function spinSlots(rng: Rng): { reels: [SlotSymbol, SlotSymbol, SlotSymbol]; mult: number } {
  const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = [reelSymbol(rng), reelSymbol(rng), reelSymbol(rng)]
  return { reels, mult: slotMultiplier(reels) }
}

export type RouletteBet = 'red' | 'black' | 'zero'
export type RouletteColor = 'red' | 'black' | 'zero'

export const rouletteColor = (n: number): RouletteColor =>
  n === 0 ? 'zero' : ROULETTE_REDS.includes(n) ? 'red' : 'black'

export function spinRoulette(rng: Rng, bet: RouletteBet): { n: number; color: RouletteColor; mult: number } {
  const n = rng.int(0, 36)
  const color = rouletteColor(n)
  const mult = bet === 'zero' ? (n === 0 ? ROULETTE_ZERO_PAY : 0) : bet === color ? ROULETTE_COLOR_PAY : 0
  return { n, color, mult }
}

export function rouletteRtp(bet: RouletteBet): number {
  let ev = 0
  for (let n = 0; n <= 36; n++) {
    const c = rouletteColor(n)
    ev += (bet === 'zero' ? (n === 0 ? ROULETTE_ZERO_PAY : 0) : bet === c ? ROULETTE_COLOR_PAY : 0) / 37
  }
  return ev
}

export function rollChest(rng: Rng): { rarity: Rarity; skin: string } {
  let q = rng.next()
  let rarity: Rarity = 'common'
  for (const [r, p] of CHEST_ODDS) {
    if ((q -= p) < 0) {
      rarity = r
      break
    }
  }
  return { rarity, skin: rng.pick(SKIN_POOL[rarity]) }
}
