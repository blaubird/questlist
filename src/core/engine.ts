// Единая точка входа: apply(state, action, ctx) → { state, events, fx }.
// decide: проверяет действие и строит событие с готовым результатом; evolve: применяет патч события.
// Профиль меняется только событиями, забег — напрямую (он локальный).
import { rollChest, spinRoulette, spinSlots, type RouletteBet } from './casino.ts'
import {
  ARMORS,
  BET_SHARES,
  BETS,
  BLESS,
  CHEST_COST,
  CHEST_DUP_SHARDS,
  ENH_MAX,
  POTION_COST,
  POTION_MAX,
  STREAK_DAY_TASKS,
  UNDO_MS,
  WEAPONS,
  type BlessTrack,
  type Difficulty,
} from './config.ts'
import {
  cloneRun,
  floorsOpen,
  greed,
  runAltar,
  runDescend,
  runDismiss,
  runPotion,
  runStep,
  runWhirl,
  startRun,
} from './dungeon/run.ts'
import type { Fx, Run } from './dungeon/types.ts'
import { currentStreak, taskReward, type DayCtx } from './economy.ts'
import { lootScale } from './dungeon/scale.ts'
import { blessCost, blessKey, enhCost, pickHero, soulsFor } from './hero.ts'
import type { Rng } from './rng.ts'
import { SKIN_BY_ID } from './skins.ts'
import { applyPatch, type GameState, type Patch, type ProfileEvent, type Task } from './state.ts'

export interface Ctx extends DayCtx {
  now: number
  /** Случайность для казино и seed забега. */
  rng: Rng
  /** Устройство-источник событий. */
  dev: string
  /** Новый уникальный id (событий и задач). */
  newId: () => string
}

export type Action =
  /** Ничего не делает, кроме смены дня (часы интерфейса: полночь при открытом приложении). */
  | { type: 'tick' }
  | { type: 'task.add'; title: string; diff: Difficulty; daily: boolean }
  | { type: 'task.complete'; id: string }
  | { type: 'task.undo'; event: ProfileEvent }
  | { type: 'task.remove'; id: string }
  | { type: 'task.restore'; task: Task; index: number }
  | { type: 'shop.weapon'; tier: number }
  | { type: 'shop.armor'; tier: number }
  | { type: 'shop.enhance'; weapon: boolean }
  | { type: 'shop.potion' }
  | { type: 'shop.bless'; track: BlessTrack }
  | { type: 'skin.set'; id: string }
  | { type: 'casino.slots'; bet: number }
  | { type: 'casino.roulette'; bet: number; on: RouletteBet }
  | { type: 'casino.chest'; scroll: boolean }
  | { type: 'run.start'; floor: number }
  | { type: 'run.step'; dx: number; dy: number }
  | { type: 'run.whirl' }
  | { type: 'run.potion' }
  | { type: 'run.descend' }
  | { type: 'run.altar'; accept: boolean }
  | { type: 'run.dismiss' }
  /** Выйти через портал с добычей (из окна портала). */
  | { type: 'run.leave' }
  /** После смерти — вернуться в лобби. */
  | { type: 'run.finish' }

export interface Result {
  state: GameState
  /** Новые события — их нужно сохранить и синхронизировать. */
  events: ProfileEvent[]
  fx: Fx[]
  /** Отказ: действие невозможно (не хватает золота и т. п.). */
  error?: string
  /** Подробности для интерфейса (награда, барабаны, выпавший облик…). */
  info?: unknown
}

const MAX_TITLE = 140

/** Цены, растущие с глубиной (осколки дешевеют по мере роста добычи). */
export const potionCost = (checkpoint: number) => Math.round(POTION_COST * lootScale(checkpoint))
export const chestDupShards = (checkpoint: number) => Math.round(CHEST_DUP_SHARDS * lootScale(checkpoint))

/** Варианты ставок: доли баланса, не меньше минимальной ставки. */
export function betOptions(gold: number): number[] {
  const min = BETS[0]
  return [...new Set(BET_SHARES.map((s) => Math.max(min, Math.floor(gold * s))))]
}
const validBet = (bet: number, gold: number) => Number.isInteger(bet) && bet >= BETS[0] && bet <= gold

export const blessOpen = (p: { checkpoint: number }) => p.checkpoint >= BLESS.minCheckpoint

export function apply(state: GameState, action: Action, ctx: Ctx): Result {
  const events: ProfileEvent[] = []
  let profile = state.profile

  const emit = (type: string, patch: Patch) => {
    const e: ProfileEvent = { id: ctx.newId(), ts: ctx.now, dev: ctx.dev, type, data: patch }
    events.push(e)
    profile = applyPatch(profile, patch)
    return e
  }
  const fail = (error: string): Result => ({ state: { ...state, profile }, events, fx: [], error })
  const done = (run: Run | null = state.run, fx: Fx[] = [], info?: unknown): Result => ({
    state: { profile, run },
    events,
    fx,
    ...(info === undefined ? {} : { info }),
  })

  // Смена дня перед любым действием.
  if (profile.day < ctx.day) emit('day.roll', { roll: ctx.day })

  const p = () => profile

  switch (action.type) {
    case 'tick':
      return done()
    // ---------- Задачи ----------
    case 'task.add': {
      const title = action.title.trim().slice(0, MAX_TITLE)
      if (!title) return fail('Пустое название')
      const task: Task = {
        id: ctx.newId(),
        title,
        diff: action.diff,
        daily: action.daily,
        created: ctx.now,
        done: false,
        doneAt: 0,
      }
      emit('task.add', { tasks: [{ op: 'add', task }] })
      return done(state.run, [], task)
    }
    case 'task.complete': {
      const task = p().tasks.find((t) => t.id === action.id)
      if (!task || task.done) return fail('Задача уже закрыта')
      const reward = taskReward(p(), task, ctx.now, ctx)
      const patch: Patch = {
        add: {
          gold: reward.gold,
          torches: reward.torches,
          dayGold: reward.gold,
          dayTorch: reward.torches,
          dayCount: 1,
          totalDone: 1,
        },
        tasks: [{ op: 'patch', id: task.id, set: { done: true, doneAt: ctx.now } }],
      }
      let streak: number | null = null
      if (p().dayCount + 1 === STREAK_DAY_TASKS && p().lastQ !== ctx.day) {
        streak = (p().lastQ === ctx.yesterday ? p().streak : 0) + 1
        patch.set = { streak, lastQ: ctx.day }
        patch.prev = { streak: p().streak, lastQ: p().lastQ }
      }
      const e = emit('task.done', patch)
      return done(state.run, [], { reward, streak, event: e })
    }
    case 'task.undo': {
      const orig = action.event
      if (orig.type !== 'task.done' || ctx.now - orig.ts > UNDO_MS) return fail('Отменить уже нельзя')
      const data = orig.data
      const op = data.tasks?.[0]
      if (!op || op.op !== 'patch') return fail('Не та задача')
      const task = p().tasks.find((t) => t.id === op.id)
      if (!task?.done) return fail('Задача не закрыта')
      const add = Object.fromEntries(Object.entries(data.add ?? {}).map(([k, v]) => [k, -(v as number)]))
      const patch: Patch = { add, tasks: [{ op: 'patch', id: op.id, set: { done: false, doneAt: 0 } }] }
      if (data.prev) patch.set = { ...data.prev }
      emit('task.undo', patch)
      return done()
    }
    case 'task.remove': {
      if (!p().tasks.some((t) => t.id === action.id)) return fail('Нет такой задачи')
      emit('task.remove', { tasks: [{ op: 'remove', id: action.id }] })
      return done()
    }
    case 'task.restore': {
      emit('task.restore', { tasks: [{ op: 'insert', index: action.index, task: action.task }] })
      return done()
    }

    // ---------- Лавка ----------
    case 'shop.weapon':
    case 'shop.armor': {
      const weapon = action.type === 'shop.weapon'
      const list = weapon ? WEAPONS : ARMORS
      const cur = weapon ? p().weapon : p().armor
      const tier = list[action.tier]
      if (!tier || action.tier <= cur) return fail('Нельзя купить')
      if (p().gold < tier.cost) return fail('Не хватает золота')
      emit(action.type, {
        add: { gold: -tier.cost },
        set: weapon ? { weapon: action.tier } : { armor: action.tier },
      })
      return done()
    }
    case 'shop.enhance': {
      const n = action.weapon ? p().wEnh : p().aEnh
      if (n >= ENH_MAX) return fail('Максимум')
      const c = enhCost(action.weapon, n)
      if (p().gold < c.gold || p().shards < c.shards) return fail('Не хватает')
      emit('shop.enhance', {
        add: { gold: -c.gold, shards: -c.shards, ...(action.weapon ? { wEnh: 1 } : { aEnh: 1 }) },
      })
      return done()
    }
    case 'shop.potion': {
      if (state.run) return fail('Во время забега лавка закрыта')
      const cost = potionCost(p().checkpoint)
      if (p().shards < cost || p().potions >= POTION_MAX) return fail('Нельзя купить')
      emit('shop.potion', { add: { shards: -cost, potions: 1 } })
      return done()
    }
    case 'shop.bless': {
      if (!blessOpen(p())) return fail(`Благословения — с чекпоинта ${BLESS.minCheckpoint}`)
      const key = blessKey(action.track)
      const cost = blessCost(p()[key])
      if (p().gold < cost) return fail('Не хватает золота')
      emit('shop.bless', { add: { gold: -cost, [key]: 1 } })
      return done()
    }

    case 'skin.set': {
      if (!SKIN_BY_ID.has(action.id) || !p().skins.includes(action.id)) return fail('Облик закрыт')
      emit('skin.set', { set: { skin: action.id } })
      return done()
    }

    // ---------- Казино ----------
    case 'casino.slots': {
      if (!validBet(action.bet, p().gold)) return fail('Нет такой ставки')
      const res = spinSlots(ctx.rng)
      const net = res.mult * action.bet - action.bet
      emit('casino.slots', { add: { gold: net, casinoNet: net } })
      return done(state.run, [], { ...res, pay: res.mult * action.bet })
    }
    case 'casino.roulette': {
      if (!validBet(action.bet, p().gold)) return fail('Нет такой ставки')
      const res = spinRoulette(ctx.rng, action.on)
      const net = res.mult * action.bet - action.bet
      emit('casino.roulette', { add: { gold: net, casinoNet: net } })
      return done(state.run, [], { ...res, pay: res.mult * action.bet })
    }
    case 'casino.chest': {
      if (action.scroll ? p().scrolls < 1 : p().gold < CHEST_COST) return fail('Не хватает')
      const res = rollChest(ctx.rng)
      const dup = p().skins.includes(res.skin)
      const patch: Patch = action.scroll
        ? { add: { scrolls: -1 } }
        : { add: { gold: -CHEST_COST, casinoNet: -CHEST_COST } }
      if (dup) patch.add = { ...patch.add, shards: chestDupShards(p().checkpoint) }
      else patch.skinsAdd = [res.skin]
      emit('casino.chest', patch)
      return done(state.run, [], { ...res, dup })
    }

    // ---------- Подземелье ----------
    case 'run.start': {
      if (state.run) return fail('Забег уже идёт')
      if (p().torches < 1) return fail('Нет факелов')
      if (!floorsOpen(p().checkpoint).includes(action.floor)) return fail('Этаж закрыт')
      const prof = p()
      const run = startRun({
        hero: { ...pickHero(prof), xp: prof.xp },
        startFloor: action.floor,
        seed: ctx.rng.int(1, 0x7fffffff),
        potions: prof.potions,
      })
      emit('run.start', {
        add: { torches: -1, runs: 1 },
        set: { best: Math.max(prof.best, action.floor) },
      })
      return done(run, [{ t: 'floor', f: action.floor }])
    }
    case 'run.leave':
    case 'run.finish': {
      const r = state.run
      if (!r) return fail('Нет забега')
      const leaving = action.type === 'run.leave'
      if (leaving && r.prompt?.kind !== 'stairs') return fail('Выйти можно только у портала')
      if (!leaving && r.over !== 'dead') return fail('Забег ещё идёт')
      const shards = leaving ? Math.round(r.shards * greed(r.depth)) : 0
      const checkpoint = Math.max(p().checkpoint, r.checkpoint)
      const souls = Math.max(0, soulsFor(checkpoint) - p().souls)
      emit('run.end', {
        add: {
          xp: r.xpGain,
          shards,
          kills: r.kills,
          potions: r.potions - r.potionsStart,
          scrolls: r.scrolls,
          souls,
        },
        set: { checkpoint, best: Math.max(p().best, r.f) },
      })
      return done(null, [], { shards, xp: r.xpGain, floor: r.f, dead: !leaving, souls })
    }
    default: {
      const r0 = state.run
      if (!r0) return fail('Нет забега')
      const r = cloneRun(r0)
      let fx: Fx[]
      switch (action.type) {
        case 'run.step':
          fx = runStep(r, action.dx, action.dy)
          break
        case 'run.whirl':
          fx = runWhirl(r)
          break
        case 'run.potion':
          fx = runPotion(r)
          break
        case 'run.descend':
          fx = runDescend(r)
          break
        case 'run.altar':
          fx = runAltar(r, action.accept)
          break
        case 'run.dismiss':
          runDismiss(r)
          fx = []
          break
      }
      return done(r, fx)
    }
  }
}

/** Активная серия на сегодня (для интерфейса). */
export const streakNow = (state: GameState, d: DayCtx) => currentStreak(state.profile, d)
