// Сцена подземелья: рисует состояние забега из core и проигрывает его визуальные события (Fx).
// Логики игры здесь нет — только картинка, анимации и тап по клетке.
import Phaser from 'phaser'
import { MAP_H, MAP_W } from '../core/config.ts'
import { computeVisible } from '../core/dungeon/fov.ts'
import type { Fx, Item, Monster, Run } from '../core/dungeon/types.ts'
import { formatBig } from '../core/format.ts'
import { SKIN_BY_ID } from '../core/skins.ts'
import type { GameState } from '../core/state.ts'
import { hash, skinColors } from '../ui/art/sprites.js'
import type { Controller } from './controller.ts'
import {
  biomeFor,
  ensureHero,
  ensureTiles,
  heroKey,
  hexNum,
  itemKey,
  loadBase,
  monKey,
  RES,
  TILE,
  tileKey,
  type BiomeView,
} from './textures.ts'

export interface SceneDeps {
  getState(): GameState
  onFx(fn: (fx: readonly Fx[], s: GameState) => void): () => void
  subscribe(fn: () => void): () => void
  controller: Controller
  reducedMotion: boolean
}

const MOVE_MS = 110
const S = 1 / RES // текстуры растеризованы с запасом — масштаб обратно

const cx = (x: number) => (x + 0.5) * TILE
const footY = (y: number) => (y + 1) * TILE - TILE * 0.06

interface MonView {
  box: Phaser.GameObjects.Container
  spr: Phaser.GameObjects.Image
  bar: Phaser.GameObjects.Graphics
  m: Monster
}

export class DungeonScene extends Phaser.Scene {
  private deps!: SceneDeps
  private ready = false
  private floorKey = ''
  private biome!: BiomeView
  private tiles: (Phaser.GameObjects.Image | null)[] = []
  private torches: Phaser.GameObjects.GameObject[] = []
  private portal: Phaser.GameObjects.Image | null = null
  private items = new Map<string, Phaser.GameObjects.Image>()
  private mons = new Map<number, MonView>()
  private hero!: Phaser.GameObjects.Container
  private heroSpr!: Phaser.GameObjects.Image
  private heroAura!: Phaser.GameObjects.Image
  private auraFx: Phaser.GameObjects.Particles.ParticleEmitter | null = null
  private light!: Phaser.GameObjects.Image
  private skin = ''
  private unsub: (() => void)[] = []
  private vis: Uint8Array = new Uint8Array(MAP_W * MAP_H)
  /** Последнее отрисованное состояние: подписка не перерисовывает то, что уже анимирует play(). */
  private drawn: GameState | null = null

  constructor() {
    super('dungeon')
  }

  init(deps: SceneDeps) {
    this.deps = deps
  }

  async create() {
    const st = this.deps.getState()
    this.cameras.main.setBackgroundColor('#05030a')
    await loadBase(this, st.profile.skin)
    if (!this.sys.isActive()) return
    this.light = this.add
      .image(0, 0, this.lightTexture())
      .setDepth(9000)
      .setScale(S * 2.4)
    this.hero = this.add.container(0, 0)
    this.heroAura = this.add
      .image(0, -TILE * 0.5, 'glow')
      .setScale(1.4)
      .setAlpha(0)
    this.heroSpr = this.add.image(0, 0, heroKey(st.profile.skin)).setOrigin(0.5, 1).setScale(S)
    this.hero.add([this.heroAura, this.heroSpr])
    this.cameras.main.startFollow(this.hero, false, 0.18, 0.18)
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.tap(p))
    this.scale.on('resize', () => this.fit())
    this.unsub.push(
      this.deps.onFx((fx, s) => this.play(fx, s)),
      this.deps.subscribe(() => {
        const st = this.deps.getState()
        if (st !== this.drawn) this.sync(st, false)
      }),
    )
    // game.destroy() шлёт сцене 'destroy', а не 'shutdown' — отписываемся на обоих, иначе мёртвая сцена
    // продолжит получать события хранилища.
    const off = () => {
      this.ready = false
      this.unsub.forEach((u) => u())
      this.unsub = []
    }
    this.events.once('shutdown', off)
    this.events.once('destroy', off)
    this.ready = true
    this.fit()
    this.sync(st, false)
  }

  /** Зум: на телефоне видно ~11 клеток в ширину, на широком экране — ~15. */
  private fit() {
    const cam = this.cameras.main
    const w = this.scale.width
    const h = this.scale.height
    const cols = w >= 600 ? 15 : 11
    const zoom = w / (cols * TILE)
    cam.setZoom(zoom)
    // Без границ: герой всегда в центре свободной области. На телефоне снизу крестовина (~200px),
    // сверху HUD (~90px) — поднимаем героя к середине между ними. Знак: камера смотрит на target − offset.
    const mobile = w < 900
    const lift = mobile ? Math.min(h * 0.12, (200 - 90) / 2 + 20) : 0
    cam.setFollowOffset(0, -(lift / zoom) + TILE * 0.5)
  }

  /** Тьма вокруг героя: прозрачный центр, плотная темнота к краям. */
  private lightTexture(): string {
    const key = 'light'
    if (this.textures.exists(key)) return key
    const s = 1024
    const c = document.createElement('canvas')
    c.width = c.height = s
    const x = c.getContext('2d')!
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(5,3,10,0)')
    g.addColorStop(0.2, 'rgba(5,3,10,0)')
    g.addColorStop(0.48, 'rgba(5,3,10,0.6)')
    g.addColorStop(0.75, 'rgba(5,3,10,0.94)')
    g.addColorStop(1, 'rgba(5,3,10,1)')
    x.fillStyle = g
    x.fillRect(0, 0, s, s)
    this.textures.addCanvas(key, c)
    return key
  }

  // ---------- Этаж ----------

  private buildFloor(r: Run) {
    for (const t of this.tiles) t?.destroy()
    for (const t of this.torches) t.destroy()
    this.portal?.destroy()
    for (const it of this.items.values()) it.destroy()
    for (const m of this.mons.values()) m.box.destroy()
    this.tiles = []
    this.torches = []
    this.items.clear()
    this.mons.clear()
    this.biome = biomeFor(r.f)
    ensureTiles(this, this.biome)
    this.cameras.main.setBackgroundColor(this.biome.void)
    const b = this.biome
    for (let y = 0; y < MAP_H; y++)
      for (let x = 0; x < MAP_W; x++) {
        const h = hash(x, y, r.f)
        const wall = r.map[y]![x] !== '.'
        let key: string
        if (wall) {
          const face = y + 1 < MAP_H && r.map[y + 1]![x] === '.'
          key = tileKey(b, face ? `face${h % 3}` : 'top')
          if (face && h % 9 === 0) this.addTorch(x, y)
        } else key = tileKey(b, (h >>> 9) % 100 < 5 ? 'deco' : `floor${h % 3}`)
        const img = this.add
          .image(x * TILE, y * TILE, key)
          .setOrigin(0)
          .setScale(S * 1.01)
          .setVisible(false)
          .setDepth(-10)
        this.tiles.push(img)
      }
    this.portal = this.add
      .image(cx(r.stairs[0]), footY(r.stairs[1]) + TILE * 0.08, itemKey('portal'))
      .setOrigin(0.5, 1)
      .setScale(S)
      .setDepth(-5)
      .setVisible(false)
    if (!this.deps.reducedMotion)
      this.tweens.add({
        targets: this.portal,
        scale: S * 1.06,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      })
    this.floorKey = `${r.seed}:${r.f}`
  }

  private addTorch(x: number, y: number) {
    const glow = this.add
      .image(cx(x), y * TILE + TILE * 0.45, 'glow')
      .setTint(0xff9a3c)
      .setAlpha(0.55)
      .setScale(1.1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-4)
      .setVisible(false)
    const flame = this.add
      .image(cx(x), y * TILE + TILE * 0.62, 'flame')
      .setOrigin(0.5, 1)
      .setScale(S)
      .setDepth(-3)
      .setVisible(false)
    if (!this.deps.reducedMotion) {
      const d = 380 + (hash(x, y, 7) % 400)
      this.tweens.add({ targets: glow, alpha: 0.35, scale: 1.25, duration: d, yoyo: true, repeat: -1 })
      this.tweens.add({ targets: flame, scaleY: S * 1.12, duration: d * 0.6, yoyo: true, repeat: -1 })
    }
    glow.setData('cell', y * MAP_W + x)
    flame.setData('cell', y * MAP_W + x)
    this.torches.push(glow, flame)
  }

  // ---------- Синхронизация с состоянием ----------

  private sync(s: GameState, animating: boolean) {
    if (!this.ready || !this.cameras?.main) return
    this.drawn = s
    const r = s.run
    if (!r) return
    if (`${r.seed}:${r.f}` !== this.floorKey) this.buildFloor(r)
    this.vis = computeVisible(r.map, r.px, r.py, r.seen.slice())

    for (let k = 0; k < this.tiles.length; k++) {
      const t = this.tiles[k]!
      const seen = r.seen[k] === 1
      t.setVisible(seen)
      if (seen) t.setTint(this.vis[k] ? 0xffffff : 0x6a6478)
    }
    for (const t of this.torches) {
      const cell = t.getData('cell') as number
      ;(t as Phaser.GameObjects.Image).setVisible(r.seen[cell] === 1)
    }
    const stairsCell = r.stairs[1] * MAP_W + r.stairs[0]
    this.portal?.setVisible(r.seen[stairsCell] === 1).setAlpha(r.bossDead ? 1 : 0.55)

    this.syncItems(r.items)
    this.syncMons(r, animating)
    this.syncHero(s, r, animating)
  }

  private syncItems(items: Item[]) {
    const keep = new Set<string>()
    for (const it of items) {
      const k = `${it.kind}:${it.x}:${it.y}`
      keep.add(k)
      let img = this.items.get(k)
      if (!img) {
        const altar = it.kind === 'altar'
        img = this.add
          .image(cx(it.x), footY(it.y) - (altar ? 0 : TILE * 0.08), itemKey(it.kind))
          .setOrigin(0.5, 1)
          .setScale(S * (altar ? 0.95 : 0.72))
          .setDepth(-2)
        if (!altar && !this.deps.reducedMotion)
          this.tweens.add({
            targets: img,
            y: img.y - 3,
            duration: 700 + ((it.x * 37) % 300),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut',
          })
        this.items.set(k, img)
      }
      img.setVisible(this.vis[it.y * MAP_W + it.x] === 1)
    }
    for (const [k, img] of this.items)
      if (!keep.has(k)) {
        img.destroy()
        this.items.delete(k)
      }
  }

  private makeMon(m: Monster): MonView {
    const box = this.add.container(cx(m.x), footY(m.y))
    const parts: Phaser.GameObjects.GameObject[] = []
    if (m.boss || m.elite) {
      const g = this.add
        .image(0, -TILE * 0.45, 'glow')
        .setTint(m.boss ? 0xff4d6d : 0xffc94d)
        .setAlpha(0.45)
        .setScale(m.boss ? 1.7 : 1.1)
        .setBlendMode(Phaser.BlendModes.ADD)
      parts.push(g)
    }
    if (m.elite) {
      const ring = this.add.graphics()
      ring.lineStyle(2, 0xffc94d, 0.85).strokeEllipse(0, -TILE * 0.04, TILE * 0.84, TILE * 0.26)
      parts.push(ring)
    }
    const scale = m.boss ? 1 : m.elite ? 0.82 : 0.74
    const spr = this.add
      .image(0, 0, monKey(m.kind))
      .setOrigin(0.5, 1)
      .setScale(S * scale)
    const bar = this.add.graphics()
    parts.push(spr, bar)
    box.add(parts)
    if (!this.deps.reducedMotion)
      this.tweens.add({
        targets: spr,
        y: -2,
        duration: 600 + (m.id % 5) * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      })
    return { box, spr, bar, m }
  }

  private syncMons(r: Run, animating: boolean) {
    const alive = new Set(r.mons.map((m) => m.id))
    for (const m of r.mons) {
      let v = this.mons.get(m.id)
      if (!v) {
        v = this.makeMon(m)
        this.mons.set(m.id, v)
      }
      v.m = m
      const visible = this.vis[m.y * MAP_W + m.x] === 1
      v.box.setVisible(visible)
      if (!animating || !visible) v.box.setPosition(cx(m.x), footY(m.y))
      v.box.setDepth(m.y + (m.boss ? 0.6 : 0.5))
      // полоса здоровья — только у раненых
      v.bar.clear()
      if (m.hp < m.mhp) {
        const w = TILE * 0.8
        const top = -TILE * (m.boss ? 1.75 : m.elite ? 1.35 : 1.2)
        v.bar.fillStyle(0x000000, 0.7).fillRect(-w / 2 - 1, top - 1, w + 2, 6)
        v.bar.fillStyle(m.elite ? 0xffc94d : 0xff4d6d).fillRect(-w / 2, top, w * Math.max(0, m.hp / m.mhp), 4)
      }
    }
    for (const [id, v] of this.mons)
      if (!alive.has(id) && !v.box.getData('dying')) {
        v.box.destroy()
        this.mons.delete(id)
      }
  }

  private syncHero(s: GameState, r: Run, animating: boolean) {
    const skin = s.profile.skin
    if (skin !== this.skin) {
      this.skin = skin
      void ensureHero(this, skin).then(() => {
        if (this.sys.isActive()) this.heroSpr.setTexture(heroKey(skin))
      })
      const c = skinColors(skin)
      const rar = SKIN_BY_ID.get(skin)?.rarity
      this.auraFx?.destroy()
      this.auraFx = null
      if (c.aura) {
        this.heroAura.setTint(hexNum(c.aura)).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD)
        if (!this.deps.reducedMotion && (rar === 'epic' || rar === 'legendary')) {
          this.auraFx = this.add.particles(0, 0, 'spark', {
            follow: this.hero,
            followOffset: { x: 0, y: -TILE * 0.3 },
            x: { min: -TILE * 0.4, max: TILE * 0.4 },
            speedY: { min: -40, max: -20 },
            lifespan: 1300,
            frequency: rar === 'legendary' ? 140 : 260,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.9, end: 0 },
            tint: hexNum(c.aura),
            blendMode: Phaser.BlendModes.ADD,
          })
          this.auraFx.setDepth(8000)
        }
      } else this.heroAura.setAlpha(0)
    }
    if (!animating) this.hero.setPosition(cx(r.px), footY(r.py))
    this.hero.setDepth(r.py + 0.55)
    this.light.setPosition(this.hero.x, this.hero.y - TILE * 0.5)
  }

  // ---------- Визуальные события ----------

  private play(fx: readonly Fx[], s: GameState) {
    if (!this.ready || !this.cameras?.main) return
    const r = s.run
    const calm = this.deps.reducedMotion
    if (fx.some((f) => f.t === 'floor')) {
      if (calm || !r) return this.sync(s, false)
      const cam = this.cameras.main
      cam.fadeOut(120, 5, 3, 10)
      cam.once('camerafadeoutcomplete', () => {
        this.sync(this.deps.getState(), false)
        cam.fadeIn(260, 5, 3, 10)
        if (r) this.banner(`Этаж ${formatBig(r.f)}`, biomeFor(r.f).n)
      })
      return
    }
    this.sync(s, !calm)
    for (const f of fx) {
      switch (f.t) {
        case 'move': {
          const target = f.who === 'hero' ? this.hero : this.mons.get(f.who)?.box
          if (!target) break
          if (calm) target.setPosition(cx(f.x), footY(f.y))
          else {
            this.tweens.add({
              targets: target,
              x: cx(f.x),
              y: footY(f.y),
              duration: MOVE_MS,
              ease: 'Quad.out',
            })
            if (f.who === 'hero')
              this.tweens.add({ targets: this.heroSpr, y: -TILE * 0.08, duration: MOVE_MS / 2, yoyo: true })
          }
          if (f.who === 'hero')
            this.tweens.add({
              targets: this.light,
              x: cx(f.x),
              y: footY(f.y) - TILE * 0.5,
              duration: calm ? 0 : MOVE_MS,
            })
          break
        }
        case 'attack': {
          if (calm) break
          const t = f.who === 'hero' ? this.heroSpr : this.mons.get(f.who)?.spr
          if (!t) break
          this.tweens.add({
            targets: t,
            x: f.dx * TILE * 0.22,
            y: f.dy * TILE * 0.22,
            duration: 70,
            yoyo: true,
            ease: 'Quad.out',
            onComplete: () => t.setPosition(0, 0),
          })
          break
        }
        case 'dmg':
          this.number(f.x, f.y, f.amount, f.kind)
          if (f.kind !== 'hurt') this.flashMon(f.x, f.y)
          else if (!calm) this.flash(this.heroSpr)
          break
        case 'miss':
          this.floatText(f.x, f.y, 'мимо', '#8e8b98', 15)
          break
        case 'heal':
          this.floatText(f.x, f.y, `+${formatBig(f.amount)}`, '#7dff9a', 18)
          break
        case 'loot': {
          const col = f.kind === 'shard' ? '#4fd8e8' : f.kind === 'potion' ? '#ff7ab8' : '#ffc94d'
          const label =
            f.kind === 'shard' ? `+${formatBig(f.amount)}` : f.kind === 'potion' ? 'зелье' : 'свиток'
          this.floatText(f.x, f.y, label, col, 17, 300)
          if (!calm) this.burst(f.x, f.y, hexNum(col), 8)
          break
        }
        case 'kill': {
          const v = this.mons.get(f.id)
          if (!v) break
          v.box.setData('dying', true)
          this.mons.delete(f.id)
          if (calm) v.box.destroy()
          else {
            this.burst(f.x, f.y, f.boss ? 0xff4d6d : 0xd9d2ea, f.boss ? 28 : 12)
            this.tweens.add({
              targets: v.box,
              alpha: 0,
              scale: 1.25,
              duration: 260,
              onComplete: () => v.box.destroy(),
            })
            if (f.boss) {
              this.cameras.main.shake(260, 0.01)
              this.banner('Босс повержен', 'новый чекпоинт')
            }
          }
          break
        }
        case 'levelup':
          if (!calm) {
            this.cameras.main.flash(220, 255, 240, 200)
            this.burst(r?.px ?? 0, r?.py ?? 0, 0xffc94d, 24)
          }
          this.banner(`Уровень ${formatBig(f.lvl)}`, 'здоровье восстановлено')
          break
        case 'whirl':
          if (!calm) this.ring()
          break
        case 'shake':
          if (!calm) this.cameras.main.shake(110, 0.004)
          break
      }
    }
  }

  private number(x: number, y: number, amount: number, kind: 'hit' | 'crit' | 'whirl' | 'hurt') {
    const col = { hit: '#ffffff', crit: '#ffc94d', whirl: '#9fe6ff', hurt: '#ff5c7a' }[kind]
    this.floatText(x, y, formatBig(amount), col, kind === 'crit' ? 26 : 19)
  }

  private floatText(x: number, y: number, text: string, color: string, size: number, delay = 0) {
    const t = this.add
      .text(cx(x) + (Math.random() - 0.5) * 10, y * TILE, text, {
        fontFamily: 'Manrope, system-ui, sans-serif',
        fontStyle: '700',
        fontSize: `${size * RES}px`,
        color,
        stroke: '#05030a',
        strokeThickness: 4 * RES,
      })
      .setOrigin(0.5, 1)
      .setScale(S)
      .setDepth(9500)
    if (this.deps.reducedMotion) {
      this.time.delayedCall(700, () => t.destroy())
      return
    }
    t.setAlpha(0)
    this.tweens.add({
      targets: t,
      alpha: { from: 1, to: 0 },
      y: t.y - TILE * 0.9,
      duration: 800,
      delay,
      ease: 'Cubic.out',
      onComplete: () => t.destroy(),
    })
  }

  private banner(title: string, sub: string) {
    const cam = this.cameras.main
    const x = cam.midPoint.x
    const y = cam.worldView.y + cam.worldView.height * 0.26
    const t = this.add
      .text(x, y, title, {
        fontFamily: '"Cormorant Garamond", Georgia, serif',
        fontStyle: '600',
        fontSize: `${30 * RES}px`,
        color: '#f6f4fa',
        stroke: '#05030a',
        strokeThickness: 6 * RES,
        align: 'center',
      })
      .setOrigin(0.5)
      .setScale(S)
      .setDepth(9600)
      .setScrollFactor(1)
    const st = this.add
      .text(x, y + 22, sub, {
        fontFamily: 'Manrope, system-ui, sans-serif',
        fontSize: `${12 * RES}px`,
        color: '#cdd6e2',
        stroke: '#05030a',
        strokeThickness: 4 * RES,
      })
      .setOrigin(0.5)
      .setScale(S)
      .setDepth(9600)
    this.tweens.add({
      targets: [t, st],
      alpha: { from: 1, to: 0 },
      duration: 600,
      delay: 900,
      onComplete: () => {
        t.destroy()
        st.destroy()
      },
    })
  }

  private flash(img: Phaser.GameObjects.Image) {
    img.setTint(0xff5c7a)
    this.time.delayedCall(90, () => img.clearTint())
  }

  private flashMon(x: number, y: number) {
    for (const v of this.mons.values())
      if (v.m.x === x && v.m.y === y) {
        v.spr.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL)
        this.time.delayedCall(70, () => v.spr.clearTint().setTintMode(Phaser.TintModes.MULTIPLY))
      }
  }

  private burst(x: number, y: number, tint: number, n: number) {
    const e = this.add.particles(cx(x), footY(y) - TILE * 0.4, 'spark', {
      speed: { min: 40, max: 150 },
      angle: { min: 0, max: 360 },
      lifespan: 500,
      scale: { start: 0.7, end: 0 },
      tint,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    })
    e.setDepth(9400)
    e.explode(n)
    this.time.delayedCall(700, () => e.destroy())
  }

  private ring() {
    const g = this.add.graphics().setDepth(9300)
    const o = { r: TILE * 0.5, a: 1 }
    this.tweens.add({
      targets: o,
      r: TILE * 1.6,
      a: 0,
      duration: 320,
      onUpdate: () => {
        g.clear()
        g.lineStyle(5 * o.a + 1, 0xffc94d, o.a).strokeCircle(this.hero.x, this.hero.y - TILE * 0.45, o.r)
      },
      onComplete: () => g.destroy(),
    })
  }

  // ---------- Ввод ----------

  private tap(p: Phaser.Input.Pointer) {
    if (p.getDistance() > 12) return // это был свайп, а не тап
    const r = this.deps.getState().run
    if (!r || r.over || r.prompt) return
    const x = Math.floor(p.worldX / TILE)
    const y = Math.floor(p.worldY / TILE)
    const c = this.deps.controller
    if (Math.abs(x - r.px) + Math.abs(y - r.py) === 1) c.step(x - r.px, y - r.py)
    else c.walkTo(x, y)
  }
}
