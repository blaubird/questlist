// pnpm sim [дней] [seed] — бот баланса, печатает таблицу прогресса.
import { simulate } from './bot.ts'

const days = Number(process.argv[2] ?? 21)
const seed = Number(process.argv[3] ?? 1)
const t0 = performance.now()
const rows = simulate(days, seed)
const every = days > 60 ? 7 : 1
const fmt = (n: number) => (Math.abs(n) >= 1e5 ? n.toExponential(2) : Math.round(n))
console.table(
  rows
    .filter((r) => r.d % every === 0 || r.d === days)
    .map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, fmt(v)]))),
)
console.log(`${days} дн., seed ${seed}: ${Math.round(performance.now() - t0)} мс`)
