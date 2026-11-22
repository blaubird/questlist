// Журнал событий — основа сохранения и синхронизации (см. docs/GAME_SPEC.md → «Сохранение»).
// Каждое действие игрока превращается в неизменяемое событие с готовым результатом.
// Состояние = снимок + события после него, упорядоченные по (ts, id). Слияние двух журналов —
// объединение по id, поэтому порядок прихода событий и дубли ни на что не влияют.

export interface GameEvent<T extends string = string, D = unknown> {
  /** Уникальный id, генерирует клиент. */
  readonly id: string
  /** Время на устройстве, мс. */
  readonly ts: number
  /** Устройство-источник. */
  readonly dev: string
  readonly type: T
  readonly data: D
}

export function compareEvents(a: GameEvent, b: GameEvent): number {
  return a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

/** Объединяет журналы: без дублей, в каноническом порядке. */
export function mergeEvents(...logs: readonly (readonly GameEvent[])[]): GameEvent[] {
  const byId = new Map<string, GameEvent>()
  for (const log of logs) for (const e of log) if (!byId.has(e.id)) byId.set(e.id, e)
  return [...byId.values()].sort(compareEvents)
}

/** Сворачивает журнал в состояние. reducer обязан быть чистым. */
export function foldEvents<S>(
  initial: S,
  events: readonly GameEvent[],
  reducer: (state: S, event: GameEvent) => S,
): S {
  return [...events].sort(compareEvents).reduce(reducer, initial)
}
