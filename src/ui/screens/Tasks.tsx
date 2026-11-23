import { useRef, useState, type FormEvent } from 'react'
import {
  DIFF,
  GOLD_CAP,
  GOLD_OVER_CAP_RATE,
  QUICK_MS,
  STREAK_DAY_TASKS,
  TORCH_CAP,
  UNDO_MS,
  type Difficulty,
} from '../../core/config.ts'
import { currentStreak, streakBonus, taskReward, type Reward } from '../../core/economy.ts'
import type { ProfileEvent, Task } from '../../core/state.ts'
import { dayCtx } from '../../sync/clock.ts'
import { Amt } from '../components/bits.tsx'
import { Icon } from '../components/Icon.tsx'
import { useToasts } from '../components/useToasts.ts'
import { useGame, useNow } from '../useGame.ts'

const SUGGEST: [string, Difficulty, boolean][] = [
  ['Учёба 30 минут', 'm', true],
  ['Зарядка', 'e', true],
  ['Уборка', 'm', false],
  ['Важный звонок', 'h', false],
  ['Разобрать почту', 'e', false],
]

const DIFFS = Object.entries(DIFF) as [Difficulty, (typeof DIFF)[Difficulty]][]

function RewardLine({ r }: { r: Reward }) {
  return (
    <>
      <Amt cur="gold" n={r.gold} plus />
      {r.torches > 0 && <Amt cur="torch" n={r.torches} plus />}
    </>
  )
}

export function Tasks() {
  const { state, dispatch } = useGame()
  const { toast, fly } = useToasts()
  const p = state.profile
  const [title, setTitle] = useState('')
  const [diff, setDiff] = useState<Difficulty>('m')
  const [daily, setDaily] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const now = useNow()
  const d = dayCtx(now)
  const streak = currentStreak(p, d)

  const add = (e: FormEvent) => {
    e.preventDefault()
    const res = dispatch({ type: 'task.add', title, diff, daily })
    if (res.error) return toast(res.error, { tone: 'error' })
    setTitle('')
    input.current?.focus()
  }

  const complete = (t: Task, el: Element | null) => {
    const res = dispatch({ type: 'task.complete', id: t.id })
    if (res.error) return toast(res.error, { tone: 'error' })
    const info = res.info as { reward: Reward; streak: number | null; event: ProfileEvent }
    fly(el, <RewardLine r={info.reward} />)
    toast(
      <>
        {info.reward.quick ? 'Закрыта сразу: половина золота, без факела' : <RewardLine r={info.reward} />}
        {info.streak ? ` · серия ${info.streak} дн.` : ''}
      </>,
      {
        ms: UNDO_MS,
        action: {
          label: 'Отменить',
          run: () => {
            const u = dispatch({ type: 'task.undo', event: info.event })
            if (u.error) toast(u.error, { tone: 'error' })
          },
        },
      },
    )
  }

  const remove = (t: Task) => {
    const index = p.tasks.findIndex((x) => x.id === t.id)
    const res = dispatch({ type: 'task.remove', id: t.id })
    if (res.error) return toast(res.error, { tone: 'error' })
    toast('Задача удалена', {
      ms: UNDO_MS,
      action: { label: 'Вернуть', run: () => dispatch({ type: 'task.restore', task: t, index }) },
    })
  }

  const row = (t: Task) => {
    const r = taskReward(p, t, now, d)
    return (
      <li key={t.id} className={`task ${t.done ? 'done' : ''}`}>
        <button
          className="chk"
          disabled={t.done}
          aria-label={t.done ? 'Сделано' : `Отметить «${t.title}» выполненной`}
          onClick={(e) => complete(t, e.currentTarget)}
        >
          {t.done && <Icon name="check" size={18} strokeWidth={2.2} />}
        </button>
        <div className="task-body">
          <span className="task-title">{t.title}</span>
          <span className="task-meta">
            {DIFF[t.diff].name}
            {!t.done && (
              <>
                {' · '}
                <RewardLine r={r} />
                {now - t.created < QUICK_MS && <span className="mute"> · сразу — половина</span>}
              </>
            )}
          </span>
        </div>
        <button className="icon-btn" aria-label={`Удалить «${t.title}»`} onClick={() => remove(t)}>
          <Icon name="close" size={18} />
        </button>
      </li>
    )
  }

  const dailies = p.tasks.filter((t) => t.daily)
  const once = p.tasks.filter((t) => !t.daily && !t.done)
  const doneOnce = p.tasks.filter((t) => !t.daily && t.done)
  const capped = p.dayGold >= GOLD_CAP

  return (
    <>
      <h1>Дела дня</h1>
      <p className="lead day-line">
        <span>
          Сделано: <b>{p.dayCount}</b>
        </span>
        <span className={capped ? 'warn' : ''}>
          <Amt cur="gold" n={p.dayGold} /> / {GOLD_CAP}
        </span>
        <span>
          <Amt cur="torch" n={p.dayTorch} /> / {TORCH_CAP}
        </span>
        <span>
          {streak
            ? `серия ${streak} дн. · +${Math.round(streakBonus(streak) * 100)}% золота`
            : `до серии ${Math.min(p.dayCount, STREAK_DAY_TASKS)}/${STREAK_DAY_TASKS}`}
        </span>
      </p>
      {capped && (
        <p className="note">
          Дневной лимит золота достигнут: дальше {Math.round(GOLD_OVER_CAP_RATE * 100)}% награды. Факелы — до{' '}
          {TORCH_CAP} в день.
        </p>
      )}

      <form className="card add" onSubmit={add}>
        <input
          ref={input}
          className="field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Что нужно сделать?"
          maxLength={140}
          autoComplete="off"
          enterKeyHint="done"
          aria-label="Новая задача"
        />
        <div className="add-row">
          <div className="seg" role="group" aria-label="Сложность">
            {DIFFS.map(([k, v]) => (
              <button key={k} type="button" aria-pressed={diff === k} onClick={() => setDiff(k)}>
                <b>{v.name}</b>
                <small>
                  <Amt cur="gold" n={v.gold} /> <Amt cur="torch" n={v.torches} />
                </small>
              </button>
            ))}
          </div>
          <label className="toggle">
            <input type="checkbox" checked={daily} onChange={(e) => setDaily(e.target.checked)} />
            <span />
            Каждый день
          </label>
          <button className="btn-pearl" type="submit" disabled={!title.trim()}>
            <Icon name="plus" size={18} /> Добавить
          </button>
        </div>
        <div className="chips">
          {SUGGEST.map(([t, df, dl]) => (
            <button
              key={t}
              type="button"
              className="chip"
              onClick={() => {
                setTitle(t)
                setDiff(df)
                setDaily(dl)
                input.current?.focus()
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </form>

      <div className="cols">
        <section>
          <h2>Ежедневные</h2>
          <ul className="card list">
            {dailies.length ? dailies.map(row) : <li className="list-empty">Привычки на каждый день.</li>}
          </ul>
        </section>
        <section>
          <h2>Разовые</h2>
          <ul className="card list">
            {once.length ? (
              once.map(row)
            ) : (
              <li className="list-empty">Пусто. Добавь дело — получишь факел.</li>
            )}
          </ul>
          {doneOnce.length > 0 && (
            <details className="card done-box">
              <summary>Сделано сегодня: {doneOnce.length}</summary>
              <ul className="list">{doneOnce.map(row)}</ul>
            </details>
          )}
        </section>
      </div>
    </>
  )
}
