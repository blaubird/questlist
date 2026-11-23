// Забег: окно Phaser (грузится лениво) + интерфейс поверх него.
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { ALTAR, DESCEND_HEAL, FLOOR_MOD, MAP_H, MAP_W, POTION_HEAL, WHIRL } from '../../core/config.ts'
import { computeVisible } from '../../core/dungeon/fov.ts'
import { altarCost, greed, runStats } from '../../core/dungeon/run.ts'
import type { Run } from '../../core/dungeon/types.ts'
import type { Action } from '../../core/engine.ts'
import { formatBig } from '../../core/format.ts'
import { Controller, STEP_MS } from '../../game/controller.ts'
import { biomeFor } from '../../game/textures.ts'
import { Amt, Meter } from '../components/bits.tsx'
import { Icon } from '../components/Icon.tsx'
import { useToasts } from '../components/useToasts.ts'
import { useGame } from '../useGame.ts'

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

function Minimap({ r, big, onToggle }: { r: Run; big: boolean; onToggle: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const cs = big ? 8 : 3
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = MAP_W * cs * dpr
    c.height = MAP_H * cs * dpr
    const x = c.getContext('2d')!
    x.setTransform(dpr, 0, 0, dpr, 0, 0)
    x.clearRect(0, 0, MAP_W * cs, MAP_H * cs)
    const b = biomeFor(r.f)
    const vis = computeVisible(r.map, r.px, r.py, r.seen.slice())
    for (let y = 0; y < MAP_H; y++)
      for (let i = 0; i < MAP_W; i++) {
        const k = y * MAP_W + i
        if (!r.seen[k]) continue
        const wall = r.map[y]![i] !== '.'
        x.fillStyle = wall ? b.hi : b.floor[0]
        x.globalAlpha = wall ? 0.55 : vis[k] ? 1 : 0.7
        x.fillRect(i * cs, y * cs, cs, cs)
      }
    x.globalAlpha = 1
    const dot = (px: number, py: number, col: string, s = 1) => {
      x.fillStyle = col
      x.fillRect(px * cs + (cs * (1 - s)) / 2, py * cs + (cs * (1 - s)) / 2, cs * s, cs * s)
    }
    if (r.seen[r.stairs[1] * MAP_W + r.stairs[0]]) dot(r.stairs[0], r.stairs[1], '#c86bff', 1.5)
    for (const it of r.items)
      if (r.seen[it.y * MAP_W + it.x]) dot(it.x, it.y, it.kind === 'altar' ? '#ff2f4a' : '#4fd8e8', 0.9)
    for (const m of r.mons)
      if (vis[m.y * MAP_W + m.x])
        dot(m.x, m.y, m.boss ? '#ff2f4a' : m.elite ? '#ffc94d' : '#ff6b81', m.boss ? 1.6 : 1)
    x.fillStyle = '#fff'
    x.beginPath()
    x.arc(r.px * cs + cs / 2, r.py * cs + cs / 2, Math.max(2, cs * 0.7), 0, 7)
    x.fill()
  }, [r, cs])
  return (
    <button className={`minimap ${big ? 'big' : ''}`} onClick={onToggle} aria-label="Карта (M)">
      <canvas ref={ref} style={{ width: MAP_W * cs, height: MAP_H * cs }} />
    </button>
  )
}

/** Кнопка с удержанием: повторяет действие, пока палец на кнопке. */
function Hold({
  label,
  rot,
  run,
  className,
}: {
  label: string
  rot: number | null
  run: () => void
  className?: string
}) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }
  useEffect(() => stop, [])
  const down = (e: RPointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    run()
    stop()
    timer.current = setInterval(run, STEP_MS + 40)
  }
  return (
    <button
      className={`pad ${className ?? ''}`}
      aria-label={label}
      onPointerDown={down}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {rot === null ? (
        <Icon name="dot" size={22} />
      ) : (
        <Icon name="chevron" size={26} strokeWidth={2} style={{ transform: `rotate(${rot}deg)` }} />
      )}
    </button>
  )
}

export function RunView() {
  const { state, store } = useGame()
  const { toast } = useToasts()
  const r = state.run!
  const host = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [bigMap, setBigMap] = useState(false)
  const ctl = useMemo(
    () => new Controller({ run: () => store.state.run, dispatch: (a) => store.dispatch(a) }),
    [store],
  )
  useEffect(() => () => ctl.cancel(), [ctl])

  // Phaser — отдельный чанк, грузится только при входе в подземелье.
  useEffect(() => {
    let destroy: (() => void) | null = null
    let alive = true
    void import('../../game/mount.ts').then(({ mountDungeon }) => {
      if (!alive || !host.current) return
      destroy = mountDungeon(host.current, {
        getState: () => store.state,
        onFx: store.onFx,
        subscribe: store.subscribe,
        controller: ctl,
        reducedMotion: reduced(),
      })
      setLoading(false)
    })
    return () => {
      alive = false
      destroy?.()
    }
  }, [store, ctl])

  const act = (a: Action) => {
    const res = ctl.act(a)
    if (res.error) toast(res.error, { tone: 'error' })
    return res
  }
  const step = (dx: number, dy: number) => {
    const cur = store.state.run
    if (cur && !cur.over && !cur.prompt) ctl.step(dx, dy)
  }

  const leave = () => {
    const res = act({ type: 'run.leave' })
    if (!res.error) {
      const i = res.info as { shards: number; xp: number; floor: number; souls: number }
      toast(
        <>
          Вышел с этажа {formatBig(i.floor)}: <Amt cur="shard" n={i.shards} plus /> · опыт +{formatBig(i.xp)}
          {i.souls > 0 && ` · души +${i.souls}`}
        </>,
        { ms: 5000 },
      )
    }
  }
  const finish = () => {
    const res = act({ type: 'run.finish' })
    if (!res.error) {
      const i = res.info as { xp: number; floor: number }
      toast(`Пал на этаже ${formatBig(i.floor)}. Добыча потеряна, опыт +${formatBig(i.xp)} остался.`, {
        ms: 5000,
      })
    }
  }

  // Клавиатура: стрелки/WASD, пробел — ждать, Q — зелье, E — вихрь, M — карта, Enter/Esc — окна.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const cur = store.state.run
      if (!cur) return
      const k = e.key.toLowerCase()
      const dirs: Record<string, [number, number]> = {
        arrowup: [0, -1],
        w: [0, -1],
        arrowdown: [0, 1],
        s: [0, 1],
        arrowleft: [-1, 0],
        a: [-1, 0],
        arrowright: [1, 0],
        d: [1, 0],
      }
      const d = dirs[k]
      if (d) {
        e.preventDefault()
        step(d[0], d[1])
      } else if (k === ' ') {
        e.preventDefault()
        step(0, 0)
      } else if (k === 'q') act({ type: 'run.potion' })
      else if (k === 'e') act({ type: 'run.whirl' })
      else if (k === 'm') setBigMap((b) => !b)
      else if (k === 'enter' && cur.prompt?.kind === 'stairs') act({ type: 'run.descend' })
      else if (k === 'enter' && cur.prompt?.kind === 'altar') act({ type: 'run.altar', accept: true })
      else if (k === 'escape' && cur.prompt?.kind === 'stairs') act({ type: 'run.dismiss' })
      else if (k === 'escape' && cur.prompt?.kind === 'altar') act({ type: 'run.altar', accept: false })
      else if (k === 'enter' && cur.over) finish()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  const st = runStats(r)
  const b = biomeFor(r.f)
  const g = greed(r.depth)
  const nextG = greed(r.depth + 1)

  return (
    <div className="run">
      <div className="run-stage" ref={host} />
      {loading && <div className="run-loading">Зажигаем факелы…</div>}

      <div className="hud">
        <div className="hud-left">
          <div className="hud-floor">
            Этаж {formatBig(r.f)} <span>{b.n}</span>
          </div>
          {r.mod && (
            <div className={`hud-mod mod-${r.mod}`} title={FLOOR_MOD.about[r.mod]}>
              {FLOOR_MOD.name[r.mod]} · {FLOOR_MOD.about[r.mod]}
            </div>
          )}
          <div className="hud-hp">
            <Icon name="heart" size={14} />
            <Meter value={r.hp} max={st.maxHp} tone={r.hp < st.maxHp * 0.35 ? '#ff5c7a' : '#7dff9a'} />
            <small>
              {formatBig(r.hp)} / {formatBig(st.maxHp)}
            </small>
          </div>
          <div className="hud-loot">
            <Amt cur="shard" n={r.shards} /> <span className="mute">×{g}</span>
            <span className="hud-lvl">ур. {formatBig(r.hero.lvl)}</span>
          </div>
        </div>
        <div className="hud-right">
          <Minimap r={r} big={bigMap} onToggle={() => setBigMap((v) => !v)} />
          <button
            className="hud-menu"
            onClick={() => {
              ctl.cancel()
              location.hash = 'tasks'
            }}
            aria-label="В меню (забег сохранится)"
          >
            <Icon name="tasks" size={18} /> Меню
          </button>
        </div>
      </div>

      <ul className="run-log" aria-live="polite">
        {r.log.slice(0, 3).map((l, i) => (
          <li key={`${r.turn}-${i}`} style={{ opacity: 1 - i * 0.3 }}>
            {l}
          </li>
        ))}
      </ul>

      <div className="controls">
        <div className="dpad">
          <Hold label="Вверх" rot={0} className="up" run={() => step(0, -1)} />
          <Hold label="Влево" rot={-90} className="left" run={() => step(-1, 0)} />
          <Hold label="Ждать" rot={null} className="mid" run={() => step(0, 0)} />
          <Hold label="Вправо" rot={90} className="right" run={() => step(1, 0)} />
          <Hold label="Вниз" rot={180} className="down" run={() => step(0, 1)} />
        </div>
        <div className="skills">
          <button
            className="skill"
            disabled={r.cd > 0}
            onClick={() => act({ type: 'run.whirl' })}
            aria-label="Вихрь (E)"
          >
            <Icon name="whirl" size={24} />
            <small>{r.cd > 0 ? r.cd : 'Вихрь'}</small>
          </button>
          <button
            className="skill"
            disabled={r.potions < 1 || r.hp >= st.maxHp}
            onClick={() => act({ type: 'run.potion' })}
            aria-label="Зелье (Q)"
          >
            <Icon name="potion" size={24} />
            <small>{r.potions}</small>
          </button>
        </div>
      </div>

      {r.prompt?.kind === 'stairs' && !r.over && (
        <div className="prompt card" role="dialog" aria-label="Портал">
          <h2>Портал</h2>
          <p className="mute">
            Глубже: +{Math.round(DESCEND_HEAL * 100)}% здоровья, добыча ×{nextG}. Или забрать{' '}
            <Amt cur="shard" n={Math.round(r.shards * g)} /> и выйти.
          </p>
          <div className="prompt-btns">
            <button className="btn-pearl" onClick={() => act({ type: 'run.descend' })}>
              Глубже
            </button>
            <button className="btn-ghost btn-line" onClick={leave}>
              Забрать и выйти
            </button>
            <button className="btn-ghost" onClick={() => act({ type: 'run.dismiss' })}>
              Остаться
            </button>
          </div>
        </div>
      )}

      {r.prompt?.kind === 'altar' && !r.over && (
        <div className="prompt card" role="dialog" aria-label="Алтарь крови">
          <h2>Алтарь крови</h2>
          <p className="mute">
            Отдать {Math.round(ALTAR.hpCost * 100)}% здоровья (−{formatBig(altarCost(r))}): осколки сейчас и
            добыча ×{greed(r.depth + ALTAR.depth)}.
          </p>
          <div className="prompt-btns">
            <button
              className="btn-pearl"
              disabled={r.hp <= altarCost(r)}
              onClick={() => act({ type: 'run.altar', accept: true })}
            >
              Принять
            </button>
            <button className="btn-ghost btn-line" onClick={() => act({ type: 'run.altar', accept: false })}>
              Уйти
            </button>
          </div>
        </div>
      )}

      {r.over === 'dead' && (
        <div className="prompt card death" role="dialog" aria-label="Гибель">
          <h2>Ты пал</h2>
          <p className="mute">
            Этаж {formatBig(r.f)}. Добыча ({formatBig(r.shards)}) потеряна, опыт +{formatBig(r.xpGain)}{' '}
            остаётся.
          </p>
          <button className="btn-pearl wide" onClick={finish}>
            В лобби
          </button>
        </div>
      )}

      <p className="sr-only">
        Зелье лечит {Math.round(POTION_HEAL * 100)}%. Вихрь бьёт всех рядом ×{WHIRL.mult}, перезарядка{' '}
        {WHIRL.cooldown} ходов.
      </p>
    </div>
  )
}
