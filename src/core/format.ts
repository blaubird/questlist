// Короткая запись больших чисел для масштаба до 1000+ уровней: 999 → «999», 12 345 → «12,3K», дальше M, B, T…
// После последнего суффикса — экспонента: «1,23e45».

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'] as const

function trim(n: number, digits: number): string {
  const s = n.toFixed(digits)
  return (s.includes('.') ? s.replace(/\.?0+$/, '') : s).replace('.', ',')
}

export function formatBig(value: number): string {
  if (!Number.isFinite(value)) return value > 0 ? '∞' : value < 0 ? '−∞' : '—'
  const sign = value < 0 ? '−' : ''
  const abs = Math.abs(value)
  if (abs < 1000) return sign + String(Math.floor(abs))

  let tier = Math.floor(Math.log10(abs) / 3)
  if (tier >= SUFFIXES.length) {
    const exp = Math.floor(Math.log10(abs))
    return `${sign}${trim(abs / 10 ** exp, 2)}e${exp}`
  }
  let scaled = abs / 1000 ** tier
  // 999 950 → «1M», а не «1000K».
  if (Number(scaled.toFixed(scaled < 100 ? 1 : 0)) >= 1000 && tier + 1 < SUFFIXES.length) {
    tier += 1
    scaled = abs / 1000 ** tier
  }
  const digits = scaled < 10 ? 2 : scaled < 100 ? 1 : 0
  return sign + trim(scaled, digits) + SUFFIXES[tier]
}
