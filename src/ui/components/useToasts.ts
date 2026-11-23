import { createContext, useContext, type ReactNode } from 'react'

export interface ToastOptions {
  /** Кнопка действия, например «Отменить». */
  action?: { label: string; run: () => void }
  ms?: number
  tone?: 'info' | 'error'
}

export interface ToastApi {
  toast: (body: ReactNode, o?: ToastOptions) => void
  /** Награда взлетает от элемента. */
  fly: (from: Element | null, body: ReactNode) => void
}

export const ToastCtx = createContext<ToastApi | null>(null)

export function useToasts(): ToastApi {
  const c = useContext(ToastCtx)
  if (!c) throw new Error('useToasts вне ToastProvider')
  return c
}
