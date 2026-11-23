import { useRef } from 'react'
import { ARMORS, BLESS, ENH_OVER, ENH_SOFT, POTION_MAX, WEAPONS, type BlessTrack } from '../../core/config.ts'
import { blessOpen, potionCost, type Action } from '../../core/engine.ts'
import { formatBig } from '../../core/format.ts'
import {
  blessCost,
  blessKey,
  enhCost,
  heroStats,
  lootMult,
  pickHero,
  soulMult,
  xpNeed,
} from '../../core/hero.ts'
import { SKINS, SKIN_BY_ID } from '../../core/skins.ts'
import { Amt, Meter, Portrait } from '../components/bits.tsx'
import { RARITY } from '../rarity.ts'
import { Icon, type IconName } from '../components/Icon.tsx'
import { useToasts } from '../components/useToasts.ts'
import { useGame } from '../useGame.ts'

const BLESSINGS: { track: BlessTrack; name: string; icon: IconName; what: string }[] = [
  { track: 'atk', name: 'Сила', icon: 'sword', what: 'атака' },
  { track: 'vit', name: 'Стойкость', icon: 'heart', what: 'здоровье и защита' },
  { track: 'loot', name: 'Удача', icon: 'luck', what: 'осколки и опыт' },
]

const pct = (m: number) => `+${formatBig(Math.round((m - 1) * 100))}%`

export function Hero() {
  const { state, dispatch, store } = useGame()
  const { toast } = useToasts()
  const p = state.profile
  const skin = SKIN_BY_ID.get(p.skin) ?? SKINS[0]!
  const st = heroStats(pickHero(p))
  const file = useRef<HTMLInputElement>(null)

  const act = (a: Action, ok?: string) => {
    const res = dispatch(a)
    if (res.error) toast(res.error, { tone: 'error' })
    else if (ok) toast(ok)
  }

  const gear = (kind: 'weapon' | 'armor') => {
    const list = kind === 'weapon' ? WEAPONS : ARMORS
    const cur = kind === 'weapon' ? p.weapon : p.armor
    const next = list[cur + 1]
    return (
      <div className="shop-row">
        <Icon name={kind === 'weapon' ? 'sword' : 'shield'} />
        <div className="shop-body">
          <b>{list[cur]!.name}</b>
          <small>
            {kind === 'weapon' ? 'атака' : 'защита'} +{list[cur]!.value}
            {next ? ` · дальше: ${next.name} (+${next.value})` : ' · лучшее'}
          </small>
        </div>
        {next && (
          <button
            className="btn-buy"
            disabled={p.gold < next.cost}
            onClick={() =>
              act(
                { type: kind === 'weapon' ? 'shop.weapon' : 'shop.armor', tier: cur + 1 },
                `Куплено: ${next.name}`,
              )
            }
          >
            <Amt cur="gold" n={next.cost} />
          </button>
        )}
      </div>
    )
  }

  const enhance = (weapon: boolean) => {
    const n = weapon ? p.wEnh : p.aEnh
    const c = enhCost(weapon, n)
    const effect =
      n < ENH_SOFT
        ? `${weapon ? 'атака' : 'защита'} +1`
        : `${weapon ? 'атака' : 'здоровье и защита'} ×${ENH_OVER.mult}`
    return (
      <div className="shop-row">
        <Icon name="star" />
        <div className="shop-body">
          <b>
            Заточка {weapon ? 'оружия' : 'брони'} +{formatBig(n)}
          </b>
          <small>следующая: {effect}</small>
        </div>
        <button
          className="btn-buy"
          disabled={p.gold < c.gold || p.shards < c.shards}
          onClick={() => act({ type: 'shop.enhance', weapon })}
        >
          {c.gold > 0 && <Amt cur="gold" n={c.gold} />}
          <Amt cur="shard" n={c.shards} />
        </button>
      </div>
    )
  }

  const potion = potionCost(p.checkpoint)
  const openBless = blessOpen(p)

  const exportSave = () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `questlist-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const importSave = async (f: File | undefined) => {
    if (!f) return
    try {
      const n = store.importJson(await f.text())
      toast(n ? `Добавлено событий: ${n}` : 'Всё это уже есть в сохранении')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Не удалось прочитать файл', { tone: 'error' })
    }
    if (file.current) file.current.value = ''
  }

  return (
    <>
      <h1>Герой</h1>
      <p className="lead">Снаряжение, заточка и облики.</p>

      <section className="card hero-card">
        <Portrait id={p.skin} size="lg" />
        <div className="hero-info">
          <div className="hero-name">{skin.name}</div>
          <div style={{ color: RARITY[skin.rarity].color }} className="mute">
            {RARITY[skin.rarity].name}
          </div>
          <div className="hero-lvl">Уровень {formatBig(p.lvl)}</div>
          <Meter value={p.xp} max={xpNeed(p.lvl)} />
          <small className="mute">
            опыт {formatBig(p.xp)} / {formatBig(xpNeed(p.lvl))} — только за монстров
          </small>
          <div className="stats3">
            <div>
              <b>
                <Icon name="heart" size={16} /> {formatBig(st.maxHp)}
              </b>
              <small>здоровье</small>
            </div>
            <div>
              <b>
                <Icon name="sword" size={16} /> {formatBig(st.atk)}
              </b>
              <small>атака</small>
            </div>
            <div>
              <b>
                <Icon name="shield" size={16} /> {formatBig(st.def)}
              </b>
              <small>защита</small>
            </div>
          </div>
          {p.souls > 0 && (
            <div className="souls">
              <Icon name="soul" size={16} /> Души: {formatBig(p.souls)} · сила {pct(soulMult(p.souls))}
            </div>
          )}
        </div>
      </section>

      <h2>Лавка</h2>
      <section className="card shop">
        {gear('weapon')}
        {gear('armor')}
        {enhance(true)}
        {enhance(false)}
        <div className="shop-row">
          <Icon name="potion" />
          <div className="shop-body">
            <b>
              Зелья {p.potions} / {POTION_MAX}
            </b>
            <small>лечат половину здоровья в забеге</small>
          </div>
          <button
            className="btn-buy"
            disabled={p.shards < potion || p.potions >= POTION_MAX || !!state.run}
            onClick={() => act({ type: 'shop.potion' })}
          >
            <Amt cur="shard" n={potion} />
          </button>
        </div>
      </section>

      <h2>Благословения</h2>
      <section className={`card shop ${openBless ? '' : 'locked'}`}>
        {!openBless && (
          <p className="note lock-note">
            <Icon name="lock" size={16} /> Открываются с чекпоинта {BLESS.minCheckpoint}. Навсегда, за золото.
          </p>
        )}
        {BLESSINGS.map((b) => {
          const lvl = p[blessKey(b.track)]
          const cost = blessCost(lvl)
          const mult = b.track === 'loot' ? lootMult({ blessLoot: lvl, souls: 0 }) : BLESS.mult ** lvl
          return (
            <div className="shop-row" key={b.track}>
              <Icon name={b.icon} />
              <div className="shop-body">
                <b>
                  {b.name} · {formatBig(lvl)}
                </b>
                <small>
                  {b.what} {pct(mult)} · следующая ×{BLESS.mult}
                </small>
              </div>
              <button
                className="btn-buy"
                disabled={!openBless || p.gold < cost}
                onClick={() => act({ type: 'shop.bless', track: b.track })}
              >
                <Amt cur="gold" n={cost} />
              </button>
            </div>
          )
        })}
      </section>

      <h2>Облики</h2>
      <p className="mute">
        {p.skins.length} из {SKINS.length}. Новые — в сундуке казино.
      </p>
      <section className="wardrobe">
        {SKINS.map((s) => {
          const own = p.skins.includes(s.id)
          return (
            <button
              key={s.id}
              className={`ward ${own ? '' : 'ward-locked'} ${p.skin === s.id ? 'ward-on' : ''}`}
              disabled={!own}
              title={own ? s.name : `${s.name} — ещё не найден`}
              aria-label={own ? `Надеть: ${s.name}` : `${s.name} — закрыт`}
              onClick={() => act({ type: 'skin.set', id: s.id })}
            >
              <Portrait id={s.id} size="sm" />
              <span style={{ color: RARITY[s.rarity].color }}>{own ? s.name : '???'}</span>
            </button>
          )
        })}
      </section>

      <h2>Летопись</h2>
      <section className="card stats-grid">
        <div>
          <b>{formatBig(p.totalDone)}</b>
          <small>задач всего</small>
        </div>
        <div>
          <b>{formatBig(p.kills)}</b>
          <small>монстров</small>
        </div>
        <div>
          <b>{formatBig(p.best)}</b>
          <small>лучший этаж</small>
        </div>
        <div>
          <b className={p.casinoNet < 0 ? 'neg' : 'pos'}>
            {p.casinoNet > 0 ? '+' : ''}
            {formatBig(p.casinoNet)}
          </b>
          <small>итог казино</small>
        </div>
      </section>

      <h2>Сохранение</h2>
      <section className="card save">
        <p className="mute">
          {store.status.storage === 'idb'
            ? 'Прогресс хранится в этом браузере. Синхронизация между устройствами — скоро.'
            : 'Браузер не даёт сохранять данные (приватный режим?) — прогресс пропадёт после закрытия. Сделай копию.'}{' '}
          Импорт объединяет журналы: текущий прогресс не теряется.
        </p>
        {store.status.error && <p className="note warn">Ошибка записи: {store.status.error}</p>}
        <div className="save-row">
          <button className="btn-ghost btn-line" onClick={exportSave}>
            <Icon name="download" size={18} /> Скачать копию
          </button>
          <button className="btn-ghost btn-line" onClick={() => file.current?.click()}>
            <Icon name="upload" size={18} /> Загрузить
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void importSave(e.target.files?.[0])}
          />
        </div>
      </section>
    </>
  )
}
