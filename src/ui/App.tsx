import { useEffect, useState, type ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { formatBig } from '../core/format.ts'
import { xpNeed } from '../core/hero.ts'
import { SKIN_BY_ID } from '../core/skins.ts'
import { Meter, Portrait } from './components/bits.tsx'
import { Icon, type IconName } from './components/Icon.tsx'
import { ToastProvider } from './components/Toasts.tsx'
import { GameProvider } from './GameProvider.tsx'
import { useProfile } from './useGame.ts'
import { Casino } from './screens/Casino.tsx'
import { Dungeon } from './screens/Dungeon.tsx'
import { Hero } from './screens/Hero.tsx'
import { Tasks } from './screens/Tasks.tsx'

type Tab = 'tasks' | 'dungeon' | 'hero' | 'casino'

const TABS: { id: Tab; label: string; icon: IconName; view: () => ReactNode }[] = [
  { id: 'tasks', label: 'Задачи', icon: 'tasks', view: () => <Tasks /> },
  { id: 'dungeon', label: 'Подземелье', icon: 'dungeon', view: () => <Dungeon /> },
  { id: 'hero', label: 'Герой', icon: 'hero', view: () => <Hero /> },
  { id: 'casino', label: 'Казино', icon: 'casino', view: () => <Casino /> },
]

const TAB_KEY = 'ql.tab'

const isTab = (v: string): v is Tab => TABS.some((t) => t.id === v)

function readTab(): Tab {
  const h = location.hash.slice(1)
  if (isTab(h)) return h
  try {
    const v = localStorage.getItem(TAB_KEY)
    if (v && isTab(v)) return v
  } catch {
    /* хранилище недоступно — не страшно */
  }
  return 'tasks'
}

function Currencies() {
  const p = useProfile()
  const items: { icon: IconName; value: number; cls: string; label: string }[] = [
    { icon: 'gold', value: p.gold, cls: 'cur-gold', label: 'Золото' },
    { icon: 'torch', value: p.torches, cls: 'cur-torch', label: 'Факелы' },
    { icon: 'shard', value: p.shards, cls: 'cur-shard', label: 'Осколки' },
  ]
  return (
    <div className="currencies">
      {items.map((c) => (
        <span
          key={c.icon}
          className={`currency ${c.cls}`}
          title={c.label}
          aria-label={`${c.label}: ${c.value}`}
        >
          <Icon name={c.icon} size={18} />
          <b key={c.value} className="tick">
            {formatBig(c.value)}
          </b>
        </span>
      ))}
    </div>
  )
}

function HeroMini() {
  const p = useProfile()
  return (
    <div className="hero-mini card">
      <Portrait id={p.skin} size="sm" />
      <div className="hero-mini-text">
        <div className="hero-mini-name">{SKIN_BY_ID.get(p.skin)?.name}</div>
        <div className="hero-mini-sub">Уровень {formatBig(p.lvl)}</div>
        <Meter value={p.xp} max={xpNeed(p.lvl)} />
      </div>
    </div>
  )
}

function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="toast toast-update" role="status">
      <span>Есть новая версия</span>
      <button className="btn-pearl btn-sm" onClick={() => void updateServiceWorker(true)}>
        Обновить
      </button>
      <button className="btn-ghost btn-sm" onClick={() => setNeedRefresh(false)}>
        Позже
      </button>
    </div>
  )
}

function Shell() {
  const [tab, setTab] = useState<Tab>(readTab)
  const current = TABS.find((t) => t.id === tab) ?? TABS[0]!

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab)
    } catch {
      /* ничего */
    }
    if (location.hash.slice(1) !== tab) history.replaceState(null, '', `#${tab}`)
    window.scrollTo({ top: 0 })
  }, [tab])

  // Ссылка вида #casino открывает нужную вкладку (и кнопка «назад» на вкладку, если её хэш поменяли руками).
  useEffect(() => {
    const on = () => {
      const h = location.hash.slice(1)
      if (isTab(h)) setTab(h)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          Квест<span>·</span>лист
        </div>
        <Currencies />
        <nav className="side-nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`side-link ${t.id === tab ? 'active' : ''}`}
              aria-current={t.id === tab ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} />
              {t.label}
            </button>
          ))}
        </nav>
        <HeroMini />
      </aside>

      <header className="topbar">
        <div className="brand brand-sm">
          Квест<span>·</span>лист
        </div>
        <Currencies />
      </header>

      <main className="content" key={tab}>
        {current.view()}
        <p className="build">сборка {__BUILD__}</p>
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${t.id === tab ? 'active' : ''}`}
            aria-current={t.id === tab ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <UpdateToast />
    </div>
  )
}

export function App() {
  return (
    <GameProvider fallback={<div className="boot" aria-busy="true" />}>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </GameProvider>
  )
}
