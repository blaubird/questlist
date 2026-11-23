// Мелкие общие элементы: валюта, полоса, портрет облика.
import type { CSSProperties, ReactNode } from 'react'
import { formatBig } from '../../core/format.ts'
import { SKIN_BY_ID } from '../../core/skins.ts'
import { RARITY } from '../rarity.ts'
import { heroSrc, skinColors } from '../art/sprites.js'
import { Icon } from './Icon.tsx'

export type Cur = 'gold' | 'torch' | 'shard'

/** Число с иконкой валюты: «25 [золото]». */
export function Amt({ cur, n, plus }: { cur: Cur; n: number; plus?: boolean }) {
  return (
    <span className={`amt cur-${cur}`}>
      {plus && n > 0 ? '+' : ''}
      {formatBig(n)}
      <Icon name={cur} size={15} />
    </span>
  )
}

export function Meter({ value, max, tone }: { value: number; max: number; tone?: string }) {
  const w = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <div className="meter" style={tone ? ({ '--meter': tone } as CSSProperties) : undefined}>
      <i style={{ transform: `scaleX(${w})` }} />
    </div>
  )
}

/** Портрет облика на фоне цвета редкости; у эпических и легендарных — мерцающая аура. */
export function Portrait({
  id,
  size = 'md',
  children,
}: {
  id: string
  size?: 'sm' | 'md' | 'lg'
  children?: ReactNode
}) {
  const skin = SKIN_BY_ID.get(id)
  const r = RARITY[skin?.rarity ?? 'start']
  const c = skinColors(id)
  const glow = skin && (skin.rarity === 'epic' || skin.rarity === 'legendary')
  return (
    <div
      className={`portrait portrait-${size} ${glow ? 'portrait-glow' : ''}`}
      style={{ '--rc': r.color, '--c1': c.aura ?? c.c1 } as CSSProperties}
    >
      <img src={heroSrc(id)} alt={skin?.name ?? ''} draggable={false} />
      {children}
    </div>
  )
}
