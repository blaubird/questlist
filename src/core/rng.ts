// Детерминированный ГПСЧ (mulberry32). Состояние — одно uint32, его можно сохранить и восстановить,
// поэтому любой этаж и любой бой воспроизводятся по seed.

export interface Rng {
  /** Равномерно в [0, 1). */
  next(): number
  /** Целое в [min, max] включительно. */
  int(min: number, max: number): number
  /** Равномерно в [min, max). */
  uniform(min: number, max: number): number
  /** true с вероятностью p. */
  chance(p: number): boolean
  pick<T>(items: readonly T[]): T
  /** Текущее состояние для сохранения. */
  state(): number
}

export function seedFrom(text: string): number {
  // FNV-1a 32 бита: строка → seed.
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    uniform: (min, max) => min + next() * (max - min),
    chance: (p) => next() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error('pick: пустой массив')
      return items[Math.floor(next() * items.length)] as (typeof items)[number]
    },
    state: () => s,
  }
}
