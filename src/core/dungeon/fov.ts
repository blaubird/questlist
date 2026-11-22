// Поле зрения: радиус² ≤ FOV_R2, видимость по Брезенхему.
import { FOV_R2, MAP_H, MAP_W } from '../config.ts'

export const isWall = (map: readonly string[], x: number, y: number): boolean =>
  x < 0 || y < 0 || x >= MAP_W || y >= MAP_H || map[y]![x] === '#'

export function lineOfSight(map: readonly string[], x0: number, y0: number, x1: number, y1: number): boolean {
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  let x = x0
  let y = y0
  while (!(x === x1 && y === y1)) {
    if (!(x === x0 && y === y0) && map[y]![x] === '#') return false
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return true
}

const R = Math.floor(Math.sqrt(FOV_R2))

/** Видимые сейчас клетки; заодно отмечает их в seen. */
export function computeVisible(map: readonly string[], px: number, py: number, seen: number[]): Uint8Array {
  const vis = new Uint8Array(MAP_W * MAP_H)
  for (let y = Math.max(0, py - R); y <= Math.min(MAP_H - 1, py + R); y++) {
    for (let x = Math.max(0, px - R); x <= Math.min(MAP_W - 1, px + R); x++) {
      if ((x - px) ** 2 + (y - py) ** 2 > FOV_R2) continue
      if (lineOfSight(map, px, py, x, y)) {
        vis[y * MAP_W + x] = 1
        seen[y * MAP_W + x] = 1
      }
    }
  }
  return vis
}
