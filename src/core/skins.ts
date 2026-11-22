// Облики героя: id, имя, редкость. Внешний вид — в слое графики (src/game, src/ui).
import type { Rarity } from './config.ts'

export type SkinRarity = Rarity | 'start'

export interface SkinDef {
  id: string
  name: string
  rarity: SkinRarity
}

export const SKINS: readonly SkinDef[] = [
  { id: 'mage', name: 'Ученик мага', rarity: 'start' },
  { id: 'squire', name: 'Оруженосец', rarity: 'common' },
  { id: 'herbalist', name: 'Травница', rarity: 'common' },
  { id: 'rogue', name: 'Плут', rarity: 'common' },
  { id: 'acolyte', name: 'Послушница', rarity: 'common' },
  { id: 'huntress', name: 'Охотница', rarity: 'common' },
  { id: 'bard', name: 'Бард', rarity: 'common' },
  { id: 'monk', name: 'Монах', rarity: 'common' },
  { id: 'witchling', name: 'Ведьмочка', rarity: 'common' },
  { id: 'guard', name: 'Стражница', rarity: 'common' },
  { id: 'alchemist', name: 'Алхимик', rarity: 'common' },
  { id: 'ninja', name: 'Ниндзя', rarity: 'rare' },
  { id: 'samurai', name: 'Самурайка', rarity: 'rare' },
  { id: 'elf', name: 'Эльфийка-лучница', rarity: 'rare' },
  { id: 'vampire', name: 'Вампир', rarity: 'rare' },
  { id: 'neko', name: 'Неко-чародейка', rarity: 'rare' },
  { id: 'paladin', name: 'Паладин', rarity: 'rare' },
  { id: 'priestess', name: 'Тёмная жрица', rarity: 'rare' },
  { id: 'plague', name: 'Чумной доктор', rarity: 'rare' },
  { id: 'kitsune', name: 'Кицунэ', rarity: 'rare' },
  { id: 'necro', name: 'Некромант', rarity: 'epic' },
  { id: 'valkyrie', name: 'Валькирия', rarity: 'epic' },
  { id: 'storm', name: 'Ведьма бури', rarity: 'epic' },
  { id: 'deathknight', name: 'Рыцарь смерти', rarity: 'epic' },
  { id: 'selena', name: 'Селена, лунная жрица', rarity: 'epic' },
  { id: 'dhunter', name: 'Охотница на демонов', rarity: 'epic' },
  { id: 'blademaster', name: 'Мастер клинков', rarity: 'epic' },
  { id: 'demoness', name: 'Демоническая чародейка', rarity: 'epic' },
  { id: 'fallen', name: 'Падший ангел', rarity: 'legendary' },
  { id: 'nightqueen', name: 'Королева ночи', rarity: 'legendary' },
  { id: 'dragonlord', name: 'Повелитель драконов', rarity: 'legendary' },
  { id: 'lich', name: 'Король-лич', rarity: 'legendary' },
  { id: 'fairy', name: 'Фея-архимаг', rarity: 'legendary' },
]

export const SKIN_BY_ID: ReadonlyMap<string, SkinDef> = new Map(SKINS.map((s) => [s.id, s]))

export const SKIN_POOL: Record<Rarity, readonly string[]> = {
  common: SKINS.filter((s) => s.rarity === 'common').map((s) => s.id),
  rare: SKINS.filter((s) => s.rarity === 'rare').map((s) => s.id),
  epic: SKINS.filter((s) => s.rarity === 'epic').map((s) => s.id),
  legendary: SKINS.filter((s) => s.rarity === 'legendary').map((s) => s.id),
}
