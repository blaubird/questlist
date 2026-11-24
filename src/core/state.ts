// Состояние игрока и его изменение событиями.
// Профиль меняется ТОЛЬКО через патчи событий (evolve). Забег (run) — локальное состояние устройства.
import { type Difficulty, START } from './config.ts'
import type { GameEvent } from './events.ts'
import type { Run } from './dungeon/types.ts'
import { addXp } from './hero.ts'

export interface Task {
  id: string
  title: string
  diff: Difficulty
  daily: boolean
  created: number
  done: boolean
  doneAt: number
}

/** Числовые поля профиля — к ним применяются прибавки. */
export interface Counters {
  gold: number
  torches: number
  shards: number
  scrolls: number
  potions: number
  xp: number
  lvl: number
  weapon: number
  armor: number
  wEnh: number
  aEnh: number
  dayGold: number
  dayTorch: number
  dayCount: number
  streak: number
  checkpoint: number
  best: number
  runs: number
  kills: number
  casinoNet: number
  totalDone: number
  blessAtk: number
  blessVit: number
  blessLoot: number
  souls: number
}

export interface Profile extends Counters {
  skin: string
  skins: string[]
  tasks: Task[]
  /** Текущий игровой день, YYYY-MM-DD. */
  day: string
  /** Последний засчитанный для серии день. */
  lastQ: string | null
}

export interface GameState {
  profile: Profile
  /** Забег в процессе — только на этом устройстве, в журнал не попадает. */
  run: Run | null
}

export type CounterKey = keyof Counters

export type TaskOp =
  | { op: 'add'; task: Task }
  | { op: 'patch'; id: string; set: Partial<Omit<Task, 'id'>> }
  | { op: 'remove'; id: string }
  | { op: 'insert'; index: number; task: Task }
  /** Смена дня: ежедневные — снова не выполнены, выполненные разовые — удалить. */
  | { op: 'rollover' }

/** Готовый результат действия. Сворачивается без случайностей и без часов. */
export interface Patch {
  add?: Partial<Counters>
  set?: Partial<Counters & Pick<Profile, 'skin' | 'lastQ'>>
  /** Поднять до значения, если сейчас меньше (рекорд, чекпоинт, тир снаряжения): устаревшее устройство не откатит. */
  max?: Partial<Counters>
  skinsAdd?: string[]
  tasks?: TaskOp[]
  /** Смена дня применяется, только если профиль ещё в более раннем дне (защита от двойной смены на двух устройствах). */
  roll?: string
  /** Прежние значения серии — для отмены. На профиль не влияет. */
  prev?: { streak: number; lastQ: string | null }
}

export type ProfileEvent = GameEvent<string, Patch>

export function freshProfile(day: string): Profile {
  return {
    gold: START.gold,
    torches: START.torches,
    shards: 0,
    scrolls: 0,
    potions: START.potions,
    xp: 0,
    lvl: 1,
    weapon: 0,
    armor: 0,
    wEnh: 0,
    aEnh: 0,
    dayGold: 0,
    dayTorch: 0,
    dayCount: 0,
    streak: 0,
    checkpoint: 1,
    best: 0,
    runs: 0,
    kills: 0,
    casinoNet: 0,
    totalDone: 0,
    blessAtk: 0,
    blessVit: 0,
    blessLoot: 0,
    souls: 0,
    skin: START.skin,
    skins: [START.skin],
    tasks: [],
    day,
    lastQ: null,
  }
}

export function freshState(day: string): GameState {
  return { profile: freshProfile(day), run: null }
}

function applyTaskOp(tasks: Task[], op: TaskOp): Task[] {
  switch (op.op) {
    case 'add':
      return tasks.some((t) => t.id === op.task.id) ? tasks : [...tasks, op.task]
    case 'insert': {
      if (tasks.some((t) => t.id === op.task.id)) return tasks
      const next = [...tasks]
      next.splice(Math.min(op.index, next.length), 0, op.task)
      return next
    }
    case 'patch':
      return tasks.map((t) => (t.id === op.id ? { ...t, ...op.set } : t))
    case 'remove':
      return tasks.filter((t) => t.id !== op.id)
    case 'rollover':
      return tasks
        .filter((t) => t.daily || !t.done)
        .map((t) => (t.daily ? { ...t, done: false, doneAt: 0 } : t))
  }
}

/** Применяет патч к профилю. Чистая функция. */
export function applyPatch(p: Profile, patch: Patch): Profile {
  let next: Profile = p
  if (patch.roll !== undefined) {
    if (p.day >= patch.roll) {
      // уже в этом дне или позже — смену дня пропускаем, но остальной патч применяем
    } else {
      next = {
        ...next,
        day: patch.roll,
        dayGold: 0,
        dayTorch: 0,
        dayCount: 0,
        tasks: applyTaskOp(next.tasks, { op: 'rollover' }),
      }
    }
  }
  if (patch.add) {
    next = { ...next }
    for (const [k, v] of Object.entries(patch.add) as [CounterKey, number][]) next[k] += v
    if (patch.add.xp) {
      const lv = addXp(next.lvl, next.xp, 0)
      next.lvl = lv.lvl
      next.xp = lv.xp
    }
  }
  if (patch.set) next = { ...next, ...patch.set }
  if (patch.max) {
    next = { ...next }
    for (const [k, v] of Object.entries(patch.max) as [CounterKey, number][]) next[k] = Math.max(next[k], v)
  }
  if (patch.skinsAdd?.length) {
    const have = new Set(next.skins)
    next = { ...next, skins: [...next.skins, ...patch.skinsAdd.filter((s) => !have.has(s))] }
  }
  if (patch.tasks?.length) {
    let tasks = next.tasks
    for (const op of patch.tasks) tasks = applyTaskOp(tasks, op)
    next = { ...next, tasks }
  }
  return next
}

/** Тратимые ресурсы: в минус не уходят. */
const SPEND: readonly CounterKey[] = ['gold', 'torches', 'shards', 'scrolls', 'potions']

/**
 * Событие с другого устройства, которое после слияния журналов уже невозможно:
 * задачу закрыли на двух устройствах, покупка без денег (потратили офлайн на другом), тот же тир дважды.
 * На своём устройстве такого не бывает: engine проверяет то же самое до события.
 */
export function conflicts(p: Profile, type: string, patch: Patch): boolean {
  const op = patch.tasks?.[0]
  if ((type === 'task.done' || type === 'task.undo') && op?.op === 'patch') {
    const t = p.tasks.find((x) => x.id === op.id)
    if (t && t.done === (type === 'task.done')) return true
  }
  if (type.startsWith('shop.') || type.startsWith('casino.')) {
    for (const k of SPEND) {
      const v = patch.add?.[k]
      if (v !== undefined && v < 0 && p[k] + v < 0) return true
    }
    for (const k of ['weapon', 'armor'] as const) {
      const v = patch.max?.[k] ?? patch.set?.[k]
      if (v !== undefined && v <= p[k]) return true
    }
  }
  return false
}

/** Редьюсер для foldEvents. Невозможные после слияния события пропускаются, ресурсы не уходят в минус. */
export function evolve(p: Profile, e: GameEvent): Profile {
  const patch = e.data as Patch
  if (conflicts(p, e.type, patch)) return patch.roll === undefined ? p : applyPatch(p, { roll: patch.roll })
  const next = applyPatch(p, patch)
  if (SPEND.every((k) => next[k] >= 0)) return next
  const fixed = { ...next }
  for (const k of SPEND) fixed[k] = Math.max(0, fixed[k])
  return fixed
}
