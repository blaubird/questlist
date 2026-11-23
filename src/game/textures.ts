// Текстуры подземелья: SVG прототипа → canvas → текстуры Phaser. Палитры краёв с кругами.
import type Phaser from 'phaser'
import { BOSSES, FLOORS_PER_BIOME, MONSTERS } from '../core/config.ts'
import { BIOMES, decoDraw, heroSrc, ITEM_SRC, MON_SRC, tiles, type Biome } from '../ui/art/sprites.js'

export const TILE = 48
/** Плотность растеризации (чёткость на ретине и при зуме). */
export const RES = 2

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const i = new Image()
    i.onload = () => ok(i)
    i.onerror = () => fail(new Error('спрайт не загрузился'))
    i.src = src
  })

async function svgTexture(scene: Phaser.Scene, key: string, src: string, w: number, h: number) {
  if (scene.textures.exists(key)) return
  const img = await loadImg(src)
  const c = document.createElement('canvas')
  c.width = Math.round(w * RES)
  c.height = Math.round(h * RES)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  scene.textures.addCanvas(key, c)
}

export const heroKey = (skin: string) => `hero:${skin}`
export const monKey = (kind: string) => `mon:${kind}`
export const itemKey = (kind: string) => `item:${kind}`

/** Облик героя грузится по требованию (их 33). */
export const ensureHero = (scene: Phaser.Scene, skin: string) =>
  svgTexture(scene, heroKey(skin), heroSrc(skin), TILE * 1.22, TILE * 1.52)

export async function loadBase(scene: Phaser.Scene, skin: string) {
  const jobs: Promise<void>[] = [ensureHero(scene, skin)]
  for (const m of [...MONSTERS, ...BOSSES]) {
    const s = TILE * 1.6
    jobs.push(svgTexture(scene, monKey(m.id), MON_SRC[m.id], s * (66 / 64), s))
  }
  for (const [k, src] of Object.entries(ITEM_SRC))
    jobs.push(svgTexture(scene, itemKey(k), src, TILE * 1.1, TILE * 1.1))
  await Promise.all(jobs)
  glowTexture(scene)
  sparkTexture(scene)
  flameTexture(scene)
}

function glowTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('glow')) return
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, s, s)
  scene.textures.addCanvas('glow', c)
}

function sparkTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('spark')) return
  const c = document.createElement('canvas')
  c.width = c.height = 16
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(8, 8, 0, 8, 8, 8)
  g.addColorStop(0, '#fff')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 16, 16)
  scene.textures.addCanvas('spark', c)
}

function flameTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('flame')) return
  const w = 24 * RES
  const h = 36 * RES
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const x = c.getContext('2d')!
  x.scale(RES, RES)
  x.fillStyle = '#5a3a28'
  x.fillRect(10, 22, 4, 12)
  const flame = (s: number, col: string) => {
    x.fillStyle = col
    x.beginPath()
    x.moveTo(12, 4 + (1 - s) * 14)
    x.bezierCurveTo(12 + 8 * s, 12, 12 + 6 * s, 24, 12, 24)
    x.bezierCurveTo(12 - 6 * s, 24, 12 - 8 * s, 12, 12, 4 + (1 - s) * 14)
    x.fill()
  }
  flame(1, '#ff7b3a')
  flame(0.7, '#ffc94d')
  flame(0.4, '#fff3a0')
  scene.textures.addCanvas('flame', c)
}

// ---------- Палитры: каждые 25 этажей круг краёв повторяется — со сдвигом оттенка и чуть темнее ----------

const CYCLE = FLOORS_PER_BIOME * BIOMES.length

function hexToHsl(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '')
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255
  const [r, g, b] = [n(0), n(2), n(4)]
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l, a]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const hh = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [hh * 60, s, l, a]
}

function hslToHex(h: number, s: number, l: number, a: number): string {
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}${
    a < 1
      ? Math.round(a * 255)
          .toString(16)
          .padStart(2, '0')
      : ''
  }`
}

function shift(hex: string, deg: number, dark: number): string {
  const [h, s, l, a] = hexToHsl(hex)
  return hslToHex((h + deg + 360) % 360, s, l * (1 - dark), a)
}

export interface BiomeView extends Biome {
  key: string
  cycle: number
}

export function biomeFor(f: number): BiomeView {
  const b = BIOMES[Math.floor((f - 1) / FLOORS_PER_BIOME) % BIOMES.length]!
  const cycle = Math.floor((f - 1) / CYCLE)
  const key = `${b.n}|${cycle}`
  if (!cycle) return { ...b, key, cycle }
  const deg = (cycle * 47) % 360
  const dark = Math.min(0.3, cycle * 0.06)
  const t = (c: string) => shift(c, deg, dark)
  return {
    ...b,
    n: b.n,
    wall: t(b.wall),
    hi: t(b.hi),
    mortar: t(b.mortar),
    top: t(b.top),
    floor: [t(b.floor[0]), t(b.floor[1]), t(b.floor[2])],
    fm: t(b.fm),
    acc: t(b.acc),
    void: t(b.void),
    key,
    cycle,
  }
}

/** Тайлы края как текстуры: tile:<key>:face0..2, top, floor0..2, deco. */
export function ensureTiles(scene: Phaser.Scene, b: BiomeView): void {
  const k = (n: string) => `tile:${b.key}:${n}`
  if (scene.textures.exists(k('top'))) return
  const set = tiles(b, TILE, RES)
  set.face.forEach((c, i) => scene.textures.addCanvas(k(`face${i}`), c))
  scene.textures.addCanvas(k('top'), set.top)
  set.floor.forEach((c, i) => scene.textures.addCanvas(k(`floor${i}`), c))
  // Пол с декором края (кости, кристаллы, руны, лёд) — статичный кадр.
  const c = document.createElement('canvas')
  c.width = c.height = TILE * RES
  const x = c.getContext('2d')!
  x.drawImage(set.floor[0]!, 0, 0)
  x.scale(RES, RES)
  decoDraw(x, b, 0, 0, TILE, 0, 1)
  scene.textures.addCanvas(k('deco'), c)
}

export const tileKey = (b: BiomeView, n: string) => `tile:${b.key}:${n}`

export const hexNum = (hex: string) => parseInt(hex.replace('#', '').slice(0, 6), 16)
