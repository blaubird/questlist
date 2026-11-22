// Награды за задачи, серия, дневные лимиты.
import {
  DIFF,
  GOLD_CAP,
  GOLD_OVER_CAP_RATE,
  QUICK_MS,
  STREAK_BONUS_MAX,
  STREAK_BONUS_PER_DAY,
  TORCH_CAP,
} from './config.ts'
import type { Profile, Task } from './state.ts'

/** Дата и «вчера» передаются снаружи: ядро не знает часового пояса. */
export interface DayCtx {
  day: string
  yesterday: string
}

export function currentStreak(p: Profile, d: DayCtx): number {
  return p.lastQ === d.day || p.lastQ === d.yesterday ? p.streak : 0
}

export function streakBonus(streak: number): number {
  return Math.min(STREAK_BONUS_MAX, STREAK_BONUS_PER_DAY * streak)
}

export interface Reward {
  gold: number
  torches: number
  quick: boolean
}

/** Порядок: база → быстрое закрытие → бонус серии → лимит. */
export function taskReward(p: Profile, task: Task, now: number, d: DayCtx): Reward {
  const base = DIFF[task.diff]
  let gold: number = base.gold
  let torches: number = base.torches
  const quick = now - task.created < QUICK_MS
  if (quick) {
    gold = Math.round(gold / 2)
    torches = 0
  }
  gold = Math.round(gold * (1 + streakBonus(currentStreak(p, d))))
  const room = Math.max(0, GOLD_CAP - p.dayGold)
  if (gold > room) gold = room + Math.round((gold - room) * GOLD_OVER_CAP_RATE)
  torches = Math.min(torches, Math.max(0, TORCH_CAP - p.dayTorch))
  return { gold, torches, quick }
}
