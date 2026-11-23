import { useState } from 'react'
import { BLESS, CHECKPOINT_STEP, GREED_MAX, GREED_PER_DEPTH } from '../../core/config.ts'
import { floorsOpen } from '../../core/dungeon/run.ts'
import { formatBig } from '../../core/format.ts'
import { Amt } from '../components/bits.tsx'
import { Icon } from '../components/Icon.tsx'
import { useToasts } from '../components/useToasts.ts'
import { useGame } from '../useGame.ts'
import { RunView } from './RunView.tsx'

export function Dungeon() {
  const { state, dispatch } = useGame()
  const { toast } = useToasts()
  const p = state.profile
  const floors = floorsOpen(p.checkpoint)
  const [pick, setPick] = useState<number | null>(null)
  const start = pick !== null && floors.includes(pick) ? pick : floors[floors.length - 1]!
  // Длинный список чекпоинтов: показываем последние, остальное — прокруткой.
  const shown = floors.slice(-24)

  if (state.run) return <RunView />

  const enter = () => {
    const res = dispatch({ type: 'run.start', floor: start })
    if (res.error) toast(res.error, { tone: 'error' })
  }

  return (
    <>
      <h1>Подземелье</h1>
      <p className="lead">Один факел — один забег. Глубже — богаче.</p>

      <section className="card lobby">
        <div className="gate" aria-hidden="true">
          <Icon name="dungeon" size={96} strokeWidth={0.8} />
          <Icon name="flame" size={28} className="gate-flame" />
        </div>
        <div className="lobby-panel">
          <h2>Врата</h2>
          <p className="mute">
            Чекпоинт {formatBig(p.checkpoint)} · лучший этаж {formatBig(p.best)} · забегов {formatBig(p.runs)}
          </p>
          <div className="floors" role="group" aria-label="Стартовый этаж">
            {shown.map((f) => (
              <button key={f} type="button" aria-pressed={f === start} onClick={() => setPick(f)}>
                {formatBig(f)}
              </button>
            ))}
          </div>
          <button className="btn-pearl wide" disabled={p.torches < 1} onClick={enter}>
            Войти с этажа {formatBig(start)} · <Amt cur="torch" n={1} />
          </button>
          <p className="note">
            {p.torches < 1 ? (
              'Факелы дают задачи. Закрой дело — и в бой.'
            ) : (
              <>
                Факелов: <Amt cur="torch" n={p.torches} /> · зелий: {p.potions}
              </>
            )}
          </p>
        </div>
      </section>

      <details className="card rules">
        <summary>Как устроено подземелье</summary>
        <ul>
          <li>Вход стоит 1 факел. Факелы даются только за задачи.</li>
          <li>Вихрь бьёт всех врагов вокруг. Элита сильнее, но даёт больше осколков и шанс на свиток.</li>
          <li>
            Каждый новый этаж в забеге +{Math.round(GREED_PER_DEPTH * 100)}% к добыче (до ×{GREED_MAX}).
            Алтари крови дают ещё больше — за здоровье.
          </li>
          <li>У портала выбираешь: глубже или забрать добычу. Смерть забирает добычу, опыт остаётся.</li>
          <li>Каждые {CHECKPOINT_STEP} этажей — босс. Победил — новый чекпоинт, с него можно начинать.</li>
          <li>
            С чекпоинта {BLESS.minCheckpoint} — благословения за золото и души за каждый новый чекпоинт. Сила
            растёт без потолка.
          </li>
        </ul>
      </details>
    </>
  )
}
