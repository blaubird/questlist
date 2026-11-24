// Провайдер игры: открывает хранилище, часы (смена дня при открытом приложении), вкладки.
import { useEffect, useState, type ReactNode } from 'react'
import { API_URL } from '../sync/api.ts'
import { openStorage } from '../sync/storage.ts'
import { GameStore, tabChannel } from '../sync/store.ts'
import { Sync } from '../sync/sync.ts'
import { GameCtx, SyncCtx } from './useGame.ts'

export function GameProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [store, setStore] = useState<GameStore | null>(null)
  const [sync, setSync] = useState<Sync | null>(null)
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
        // Только для разработки: доступ к хранилищу из консоли и автотестов в браузере.
        if (import.meta.env.DEV) (window as unknown as { __ql: GameStore }).__ql = s
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

  // Сервер синхронизации: SDK грузится лениво; без адреса в сборке — офлайн-режим.
  useEffect(() => {
    if (!store || !API_URL) return
    let alive = true
    let s: Sync | null = null
    void import('../sync/pocketbase.ts')
      .then(({ pocketbaseRemote }) => pocketbaseRemote(API_URL))
      .then((remote) => {
        if (!alive) return
        s = new Sync(store, remote)
        setSync(s)
        void s.start()
      })
      .catch(() => {})
    return () => {
      alive = false
      s?.close()
    }
  }, [store])

  useEffect(() => {
    if (!store) return
    const wake = () => {
      if (document.visibilityState !== 'visible') return
      store.dispatch({ type: 'tick' })
      void store.reload()
      sync?.soon(0)
    }
    const timer = setInterval(() => {
      store.dispatch({ type: 'tick' })
      // Подстраховка живой подписки: раз в минуту догоняем, пока приложение на экране.
      if (document.visibilityState === 'visible') sync?.soon(0)
    }, 60_000)
    const online = () => sync?.soon(0)
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('focus', wake)
    window.addEventListener('online', online)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('focus', wake)
      window.removeEventListener('online', online)
    }
  }, [store, sync])

  if (error) return <div className="boot">Не удалось открыть сохранение: {error}</div>
  if (!store) return <>{fallback}</>
  return (
    <GameCtx.Provider value={store}>
      <SyncCtx.Provider value={sync}>{children}</SyncCtx.Provider>
    </GameCtx.Provider>
  )
}
