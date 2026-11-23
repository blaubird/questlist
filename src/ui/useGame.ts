// Хуки игры: доступ к хранилищу и состоянию, текущее время для подсказок.
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import type { Action, Result } from '../core/engine.ts'
import type { GameState } from '../core/state.ts'
import type { GameStore } from '../sync/store.ts'

export const GameCtx = createContext<GameStore | null>(null)

export function useStore(): GameStore {
  const s = useContext(GameCtx)
  if (!s) throw new Error('useStore вне GameProvider')
  return s
}

export function useGame(): { state: GameState; dispatch: (a: Action) => Result; store: GameStore } {
  const store = useStore()
  const state = useSyncExternalStore(store.subscribe, store.getState)
  return { state, dispatch: (a) => store.dispatch(a), store }
}

export const useProfile = () => useGame().state.profile

/** Текущее время, обновляется раз в stepMs (подсказки, зависящие от часов, не застывают). */
export function useNow(stepMs = 15_000): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), stepMs)
    return () => clearInterval(t)
  }, [stepMs])
  return now
}
