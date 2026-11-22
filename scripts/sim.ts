// pnpm sim [дней] [seed] — бот баланса, печатает таблицу прогресса.
import { simulate } from './bot.ts'

const days = Number(process.argv[2] ?? 21)
const seed = Number(process.argv[3] ?? 1)
const t0 = performance.now()
const rows = simulate(days, seed)
console.table(rows)
console.log(`${days} дн., seed ${seed}: ${Math.round(performance.now() - t0)} мс`)
