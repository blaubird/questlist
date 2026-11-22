import { apply, type Action, type Ctx, type Result } from '../src/core/engine.ts'
import { createRng } from '../src/core/rng.ts'
import { freshState, type GameState, type ProfileEvent } from '../src/core/state.ts'

export const DAY = '2026-11-23'
export const YESTERDAY = '2026-11-22'
export const T0 = Date.UTC(2026, 10, 23, 9, 0, 0)

/** Тестовый мир: состояние, часы, журнал. */
export function world(seed = 1, day = DAY) {
  let n = 0
  const rng = createRng(seed)
  const w = {
    state: freshState(day) as GameState,
    log: [] as ProfileEvent[],
    now: T0,
    day,
    yesterday: YESTERDAY,
    ctx(): Ctx {
      return {
        now: w.now,
        day: w.day,
        yesterday: w.yesterday,
        rng,
        dev: 'test',
        newId: () => `id${++n}x0000`,
      }
    },
    act(action: Action): Result {
      const res = apply(w.state, action, w.ctx())
      w.state = res.state
      w.log.push(...res.events)
      return res
    },
    /** Добавить задачу «давно» (не быстрое закрытие) и закрыть. */
    task(diff: 'e' | 'm' | 'h' = 'm', daily = false): Result {
      const add = w.act({ type: 'task.add', title: 'Задача', diff, daily })
      w.now += 10 * 60 * 1000
      return w.act({ type: 'task.complete', id: (add.info as { id: string }).id })
    },
  }
  return w
}
