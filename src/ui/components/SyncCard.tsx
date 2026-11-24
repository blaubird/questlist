// Синхронизация между устройствами: вход в PocketBase и статус очереди.
import { useState, type FormEvent } from 'react'
import { formatBig } from '../../core/format.ts'
import type { SyncStatus } from '../../sync/sync.ts'
import { useNow, useSync } from '../useGame.ts'
import { Icon } from './Icon.tsx'

function ago(ms: number): string {
  const m = Math.floor(ms / 60_000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин назад`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h} ч назад` : `${Math.floor(h / 24)} дн назад`
}

function statusLine(s: SyncStatus, now: number): string {
  const wait = s.pending ? ` Ждут отправки: ${formatBig(s.pending)}.` : ''
  switch (s.state) {
    case 'off':
      return 'Сервер не настроен в этой сборке.'
    case 'signedout':
      return 'Вход не выполнен — прогресс только на этом устройстве.' + wait
    case 'syncing':
      return 'Синхронизация…' + wait
    case 'ok':
      return `Синхронизировано ${s.last ? ago(now - s.last) : ''}.` + wait
    case 'offline':
      return 'Сервер недоступен — комп выключен или нет сети. Всё сохранено здесь и уйдёт само.' + wait
    case 'error':
      return (s.error ?? 'Ошибка синхронизации') + '.' + wait
  }
}

export function SyncCard() {
  const { sync, status } = useSync()
  const now = useNow(30_000)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!sync) return <p className="sync-line">{statusLine(status, now)}</p>

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await sync.login(email.trim(), password)
      setPassword('')
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sync">
      <p className={`sync-line sync-${status.state}`}>
        <Icon name="cloud" size={18} />
        <span>{statusLine(status, now)}</span>
      </p>
      {status.state === 'signedout' ? (
        <form className="sync-form" onSubmit={(e) => void submit(e)}>
          {status.error && <p className="note warn">{status.error}</p>}
          <input
            className="field"
            type="email"
            autoComplete="username"
            placeholder="Почта"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {err && <p className="note warn">{err}</p>}
          <button className="btn-pearl" disabled={busy}>
            {busy ? 'Вход…' : 'Войти'}
          </button>
        </form>
      ) : (
        <div className="save-row">
          <span className="sync-user">{status.email}</span>
          <button
            className="btn-ghost btn-line"
            disabled={status.state === 'syncing'}
            onClick={() => void sync.syncNow()}
          >
            <Icon name="repeat" size={18} /> Синхронизировать
          </button>
          <button className="btn-ghost" onClick={() => sync.logout()}>
            Выйти
          </button>
        </div>
      )}
    </div>
  )
}
