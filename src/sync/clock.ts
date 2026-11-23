// Календарь устройства: ядро не знает часового пояса, день считается здесь — по местному времени.
import type { DayCtx } from '../core/economy.ts'

const pad = (n: number) => String(n).padStart(2, '0')

/** YYYY-MM-DD по местному времени. */
export function localDay(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function dayCtx(t: number): DayCtx {
  const y = new Date(t)
  y.setDate(y.getDate() - 1)
  return { day: localDay(t), yesterday: localDay(y.getTime()) }
}
