import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { START } from '../core/config.ts'
import { formatBig } from '../core/format.ts'
import { Icon, type IconName } from './components/Icon.tsx'

type Tab = 'tasks' | 'dungeon' | 'hero' | 'casino'

const TABS: { id: Tab; label: string; icon: IconName; title: string; lead: string }[] = [
  {
    id: 'tasks',
    label: 'Задачи',
    icon: 'tasks',
    title: 'Задачи',
    lead: 'Реальные дела приносят золото и факелы.',
  },
  {
    id: 'dungeon',
    label: 'Подземелье',
    icon: 'dungeon',
    title: 'Подземелье',
    lead: 'Один факел — один забег. Глубже — богаче.',
  },
  { id: 'hero', label: 'Герой', icon: 'hero', title: 'Герой', lead: 'Снаряжение, заточка и облики.' },
  {
    id: 'casino',
    label: 'Казино',
    icon: 'casino',
    title: 'Казино',
    lead: 'Только игровое золото. Дом всегда в плюсе.',
  },
]

const TAB_KEY = 'ql.tab'

function readTab(): Tab {
  try {
    const v = localStorage.getItem(TAB_KEY)
    if (v && TABS.some((t) => t.id === v)) return v as Tab
  } catch {
    /* хранилище недоступно — не страшно */
  }
  return 'tasks'
}

function Currencies() {
  const items: { icon: IconName; value: number; cls: string; label: string }[] = [
    { icon: 'gold', value: START.gold, cls: 'cur-gold', label: 'Золото' },
    { icon: 'torch', value: START.torches, cls: 'cur-torch', label: 'Факелы' },
    { icon: 'shard', value: 0, cls: 'cur-shard', label: 'Осколки' },
  ]
  return (
    <div className="currencies">
      {items.map((c) => (
        <span key={c.icon} className={`currency ${c.cls}`} title={c.label}>
          <Icon name={c.icon} size={18} />
          <b>{formatBig(c.value)}</b>
        </span>
      ))}
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
    <div className="toast" role="status">
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

export function App() {
  const [tab, setTab] = useState<Tab>(readTab)
  const current = TABS.find((t) => t.id === tab) ?? TABS[0]!

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab)
    } catch {
      /* ничего */
    }
  }, [tab])

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
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="hero-mini card">
          <div className="hero-mini-portrait" />
          <div>
            <div className="hero-mini-name">Ученик мага</div>
            <div className="hero-mini-sub">Уровень 1</div>
          </div>
        </div>
      </aside>

      <header className="topbar">
        <div className="brand brand-sm">
          Квест<span>·</span>лист
        </div>
        <Currencies />
      </header>

      <main className="content" key={tab}>
        <h1>{current.title}</h1>
        <p className="lead">{current.lead}</p>
        <section className="card empty">
          <div className="empty-icon">
            <Icon name={current.icon} size={40} />
          </div>
          <p>Скоро здесь.</p>
          <p className="mute">Каркас готов — экран появится на этапе 2.</p>
        </section>
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${t.id === tab ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <UpdateToast />
    </div>
  )
}
