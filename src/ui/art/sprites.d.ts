import type { SlotSymbol } from '../../core/config.ts'

export function heroSrc(id: string): string
export function skinColors(id: string): { c1: string; c2: string; aura: string | null; eye: string | null }
export const SLOT_SRC: Record<SlotSymbol, string>
