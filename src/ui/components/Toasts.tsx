// Всплывающие сообщения (с кнопкой «Отменить») и летящие награды над кнопкой.
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { ToastCtx, type ToastOptions } from './useToasts.ts'

interface ToastItem extends ToastOptions {
  id: number
  body: ReactNode
}

interface Flyer {
  id: number
  x: number
  y: number
  body: ReactNode
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null)
  const [flyers, setFlyers] = useState<Flyer[]>([])
  const seq = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((body: ReactNode, o: ToastOptions = {}) => {
    const id = ++seq.current
    if (timer.current) clearTimeout(timer.current)
    setToast({ id, body, ...o })
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), o.ms ?? 3200)
  }, [])

  const fly = useCallback((from: Element | null, body: ReactNode) => {
    if (!from) return
    const r = from.getBoundingClientRect()
    const id = ++seq.current
    setFlyers((f) => [...f, { id, x: r.left + r.width / 2, y: r.top, body }])
    setTimeout(() => setFlyers((f) => f.filter((x) => x.id !== id)), 1100)
  }, [])

  return (
    <ToastCtx.Provider value={{ toast: show, fly }}>
      {children}
      {createPortal(
        <>
          {toast && (
            <div
              key={toast.id}
              className={`toast ${toast.tone === 'error' ? 'toast-error' : ''}`}
              role="status"
            >
              <span>{toast.body}</span>
              {toast.action && (
                <button
                  className="btn-pearl btn-sm"
                  onClick={() => {
                    toast.action!.run()
                    setToast(null)
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          )}
          {flyers.map((f) => (
            <div key={f.id} className="flyer" style={{ left: f.x, top: f.y }} aria-hidden="true">
              {f.body}
            </div>
          ))}
        </>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}
