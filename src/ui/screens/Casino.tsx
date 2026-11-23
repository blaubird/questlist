import { useEffect, useRef, useState } from 'react'
import { rouletteColor, rouletteRtp, slotRtp, type RouletteBet } from '../../core/casino.ts'
import {
  CHEST_COST,
  CHEST_ODDS,
  ROULETTE_COLOR_PAY,
  ROULETTE_ZERO_PAY,
  SLOT_PAY,
  SLOT_WEIGHTS,
  type Rarity,
  type SlotSymbol,
} from '../../core/config.ts'
import { betOptions, chestDupShards, type Result } from '../../core/engine.ts'
import { formatBig } from '../../core/format.ts'
import { SKIN_BY_ID } from '../../core/skins.ts'
import { SLOT_SRC } from '../art/sprites.js'
import { Amt, Portrait } from '../components/bits.tsx'
import { RARITY } from '../rarity.ts'
import { Icon } from '../components/Icon.tsx'
import { useToasts } from '../components/useToasts.ts'
import { useGame } from '../useGame.ts'

const SYMBOLS = SLOT_WEIGHTS.map(([s]) => s)
const SPIN_MS = 900
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const randSym = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]!

/** Анимация, затем действие: исход решается в момент остановки, поэтому счётчик золота не выдаёт его заранее. */
function useSpin() {
  const [busy, setBusy] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => void (t.current && clearTimeout(t.current)), [])
  const run = (ms: number, finish: () => void) => {
    setBusy(true)
    t.current = setTimeout(
      () => {
        finish()
        setBusy(false)
      },
      reduced() ? 0 : ms,
    )
  }
  return { busy, run }
}

function Bets({ gold, bet, setBet }: { gold: number; bet: number; setBet: (n: number) => void }) {
  const opts = betOptions(gold)
  return (
    <div className="seg seg-sm" role="group" aria-label="Ставка">
      {opts.map((b) => (
        <button key={b} type="button" aria-pressed={bet === b} disabled={b > gold} onClick={() => setBet(b)}>
          <Amt cur="gold" n={b} />
        </button>
      ))}
    </div>
  )
}

export function Casino() {
  const { state, dispatch } = useGame()
  const { toast, fly } = useToasts()
  const p = state.profile
  const opts = betOptions(p.gold)
  const [betIdx, setBetIdx] = useState(0)
  const bet = opts[Math.min(betIdx, opts.length - 1)] ?? 10
  const setBet = (b: number) => setBetIdx(Math.max(0, opts.indexOf(b)))
  const canBet = p.gold >= bet

  // ---------- Слоты ----------
  const slots = useSpin()
  const [reels, setReels] = useState<SlotSymbol[]>(['eye', 'crown', 'goblet'])
  const [slotMsg, setSlotMsg] = useState('')
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => void (tick.current && clearInterval(tick.current)), [])

  const spin = (el: Element) => {
    setSlotMsg('')
    if (!reduced()) tick.current = setInterval(() => setReels([randSym(), randSym(), randSym()]), 70)
    slots.run(SPIN_MS, () => {
      if (tick.current) clearInterval(tick.current)
      const res = dispatch({ type: 'casino.slots', bet })
      if (res.error) return toast(res.error, { tone: 'error' })
      const info = res.info as { reels: SlotSymbol[]; pay: number; mult: number }
      setReels(info.reels)
      if (info.pay > bet) fly(el, <Amt cur="gold" n={info.pay - bet} plus />)
      setSlotMsg(info.mult === 0 ? 'Мимо' : info.mult === 1 ? 'Ставка вернулась' : `Выигрыш ×${info.mult}`)
    })
  }

  // ---------- Рулетка ----------
  const wheel = useSpin()
  const [num, setNum] = useState<number | null>(null)
  const [rouMsg, setRouMsg] = useState('')
  const roll = (on: RouletteBet, el: Element) => {
    setRouMsg('')
    if (!reduced()) tick.current = setInterval(() => setNum(Math.floor(Math.random() * 37)), 60)
    wheel.run(SPIN_MS, () => {
      if (tick.current) clearInterval(tick.current)
      const res = dispatch({ type: 'casino.roulette', bet, on })
      if (res.error) return toast(res.error, { tone: 'error' })
      const info = res.info as { n: number; pay: number }
      setNum(info.n)
      if (info.pay > 0) fly(el, <Amt cur="gold" n={info.pay - bet} plus />)
      setRouMsg(info.pay > 0 ? `Выигрыш ×${info.pay / bet}` : 'Мимо')
    })
  }

  // ---------- Сундук ----------
  const chest = useSpin()
  const [found, setFound] = useState<{ skin: string; rarity: Rarity; dup: boolean } | null>(null)
  const open = (scroll: boolean) => {
    setFound(null)
    chest.run(SPIN_MS, () => {
      const res: Result = dispatch({ type: 'casino.chest', scroll })
      if (res.error) return toast(res.error, { tone: 'error' })
      setFound(res.info as { skin: string; rarity: Rarity; dup: boolean })
    })
  }

  const busy = slots.busy || wheel.busy || chest.busy
  const color = num === null ? null : rouletteColor(num)

  return (
    <>
      <h1>Казино</h1>
      <p className="lead">
        Только игровое золото. Дом всегда в плюсе: слоты возвращают {(slotRtp() * 100).toFixed(1)}%, рулетка{' '}
        {(rouletteRtp('red') * 100).toFixed(1)}%. Итог:{' '}
        <b className={p.casinoNet < 0 ? 'neg' : 'pos'}>
          {p.casinoNet > 0 ? '+' : ''}
          {formatBig(p.casinoNet)}
        </b>
      </p>

      <div className="bet-bar">
        <span className="mute">Ставка — доля золота</span>
        <Bets gold={p.gold} bet={bet} setBet={setBet} />
      </div>

      <div className="cols">
        <section className="card game">
          <h2>Слоты</h2>
          <div className={`reels ${slots.busy ? 'spinning' : ''}`} aria-live="polite">
            {reels.map((s, i) => (
              <div className="reel" key={i}>
                <img src={SLOT_SRC[s]} alt={s} draggable={false} />
              </div>
            ))}
          </div>
          <button
            className="btn-pearl wide"
            disabled={busy || !canBet}
            onClick={(e) => spin(e.currentTarget)}
          >
            Крутить · <Amt cur="gold" n={bet} />
          </button>
          <p className="res-msg">{slotMsg}</p>
          <details>
            <summary>Выплаты</summary>
            <ul className="paytable">
              {SYMBOLS.slice()
                .reverse()
                .map((s) => (
                  <li key={s}>
                    <span>
                      <img src={SLOT_SRC[s]} alt="" />
                      <img src={SLOT_SRC[s]} alt="" />
                      <img src={SLOT_SRC[s]} alt="" />
                    </span>
                    <b>×{SLOT_PAY[s]}</b>
                  </li>
                ))}
              <li>
                <span>
                  <img src={SLOT_SRC.skull} alt="" />
                  <img src={SLOT_SRC.skull} alt="" />
                  <span className="mute">любой</span>
                </span>
                <b>×1</b>
              </li>
            </ul>
          </details>
        </section>

        <section className="card game">
          <h2>Рулетка</h2>
          <div className={`wheel-num ${color ?? ''} ${wheel.busy ? 'spinning' : ''}`} aria-live="polite">
            {num ?? '—'}
          </div>
          <div className="rou-bets">
            <button
              className="rou red"
              disabled={busy || !canBet}
              onClick={(e) => roll('red', e.currentTarget)}
            >
              Красное ×{ROULETTE_COLOR_PAY}
            </button>
            <button
              className="rou black"
              disabled={busy || !canBet}
              onClick={(e) => roll('black', e.currentTarget)}
            >
              Чёрное ×{ROULETTE_COLOR_PAY}
            </button>
            <button
              className="rou zero"
              disabled={busy || !canBet}
              onClick={(e) => roll('zero', e.currentTarget)}
            >
              Зеро ×{ROULETTE_ZERO_PAY}
            </button>
          </div>
          <p className="res-msg">{rouMsg}</p>
        </section>
      </div>

      <section className="card game chest-game">
        <h2>Сундук обликов</h2>
        <div className={`chest-stage ${chest.busy ? 'shaking' : ''}`}>
          {found ? (
            <div className="chest-found" style={{ color: RARITY[found.rarity].color }}>
              <Portrait id={found.skin} size="md" />
              <b>{SKIN_BY_ID.get(found.skin)?.name}</b>
              <small>
                {RARITY[found.rarity].name}
                {found.dup && (
                  <>
                    {' · повтор → '}
                    <Amt cur="shard" n={chestDupShards(p.checkpoint)} plus />
                  </>
                )}
              </small>
            </div>
          ) : (
            <Icon name="chest" size={72} strokeWidth={1} />
          )}
        </div>
        <ul className="odds">
          {CHEST_ODDS.map(([r, q]) => (
            <li key={r} style={{ color: RARITY[r].color }}>
              {RARITY[r].name} {Math.round(q * 100)}%
            </li>
          ))}
        </ul>
        <div className="chest-btns">
          <button className="btn-pearl" disabled={busy || p.gold < CHEST_COST} onClick={() => open(false)}>
            Открыть · <Amt cur="gold" n={CHEST_COST} />
          </button>
          <button className="btn-ghost btn-line" disabled={busy || p.scrolls < 1} onClick={() => open(true)}>
            <Icon name="scroll" size={18} /> Свиток · {p.scrolls}
          </button>
        </div>
      </section>
    </>
  )
}
