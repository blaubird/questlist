// Хуки игры: доступ к хранилищу и состоянию, текущее время для подсказок.
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import type { Action, Result } from '../core/engine.ts'
import type { GameState } from '../core/state.ts'
import type { GameStore } from '../sync/store.ts'
import type { Sync, SyncStatus } from '../sync/sync.ts'

export const GameCtx = createContext<GameStore | null>(null)
export const SyncCtx = createContext<Sync | null>(null)

const OFF: SyncStatus = { state: 'off', email: null, pending: 0, last: null, error: null }
const noSub = () => () => {}
const offStatus = () => OFF

/** Синхронизация и её статус (state 'off' — сервер не настроен в сборке). */
export function useSync(): { sync: Sync | null; status: SyncStatus } {
  const sync = useContext(SyncCtx)
  const status = useSyncExternalStore(sync?.subscribe ?? noSub, sync?.getStatus ?? offStatus)
  return { sync, status }
}

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
