import type { SkinRarity } from '../core/skins.ts'

export const RARITY: Record<SkinRarity, { name: string; color: string }> = {
  start: { name: 'Стартовый', color: 'var(--r-common)' },
  common: { name: 'Обычный', color: 'var(--r-common)' },
  rare: { name: 'Редкий', color: 'var(--r-rare)' },
  epic: { name: 'Эпический', color: 'var(--r-epic)' },
  legendary: { name: 'Легендарный', color: 'var(--r-legend)' },
}
