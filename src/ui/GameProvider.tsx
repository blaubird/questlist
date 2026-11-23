// Провайдер игры: открывает хранилище, часы (смена дня при открытом приложении), вкладки.
import { useEffect, useState, type ReactNode } from 'react'
import { openStorage } from '../sync/storage.ts'
import { GameStore, tabChannel } from '../sync/store.ts'
import { GameCtx } from './useGame.ts'

export function GameProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [store, setStore] = useState<GameStore | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    let s: GameStore | null = null
    void (async () => {
      try {
        const storage = await openStorage()
        s = await GameStore.open(storage, { channel: tabChannel() })
        if (!alive) return s.close()
        s.dispatch({ type: 'tick' })
        setStore(s)
        // Просим браузер не вычищать данные (iOS чистит хранилище неустановленных сайтов).
        void navigator.storage?.persist?.().catch(() => {})
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      alive = false
      s?.close()
    }
  }, [])

  useEffect(() => {
    if (!store) return
    const wake = () => {
      if (document.visibilityState !== 'visible') return
      store.dispatch({ type: 'tick' })
      void store.reload()
    }
    const timer = setInterval(() => store.dispatch({ type: 'tick' }), 60_000)
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('focus', wake)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('focus', wake)
    }
  }, [store])

  if (error) return <div className="boot">Не удалось открыть сохранение: {error}</div>
  if (!store) return <>{fallback}</>
  return <GameCtx.Provider value={store}>{children}</GameCtx.Provider>
}
