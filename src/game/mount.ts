// Точка входа слоя Phaser (грузится лениво): создаёт игру в контейнере и возвращает функцию уничтожения.
import Phaser from 'phaser'
import { DungeonScene, type SceneDeps } from './DungeonScene.ts'

export function mountDungeon(parent: HTMLElement, deps: SceneDeps): () => void {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#05030a',
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
    banner: false,
    input: { mouse: { preventDefaultWheel: false } },
    // Phaser сам ставит requestAnimationFrame; на iPhone 60 кадров/с
    fps: { target: 60 },
  })
  game.scene.add('dungeon', DungeonScene, true, deps)
  return () => game.destroy(true)
}
