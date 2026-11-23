import type { BossId, MonsterId, SlotSymbol } from '../../core/config.ts'
import type { ItemKind } from '../../core/dungeon/types.ts'

export interface Biome {
  n: string
  wall: string
  hi: string
  mortar: string
  top: string
  floor: [string, string, string]
  fm: string
  acc: string
  deco: 'bones' | 'crystal' | 'rune' | 'ice'
  void: string
}
export interface TileSet {
  face: HTMLCanvasElement[]
  top: HTMLCanvasElement
  floor: HTMLCanvasElement[]
}

export function heroSrc(id: string): string
export function skinColors(id: string): { c1: string; c2: string; aura: string | null; eye: string | null }
export const SLOT_SRC: Record<SlotSymbol, string>
export const MON_SRC: Record<MonsterId | BossId, string>
export const ITEM_SRC: Record<ItemKind | 'portal', string>
export const BIOMES: readonly Biome[]
export function biomeOf(f: number): Biome
/** Тайлы края: размер T в css-пикселях, dpr — плотность. Кэшируются. */
export function tiles(b: Biome, T: number, dpr: number): TileSet
export function decoDraw(
  x: CanvasRenderingContext2D,
  b: Biome,
  X: number,
  Y: number,
  T: number,
  t: number,
  h: number,
): void
export function hash(x: number, y: number, f: number): number
