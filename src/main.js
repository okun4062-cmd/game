import { createBootScene } from './scenes/BootScene.js';
import { createWorldScene } from './scenes/WorldScene.js?v=20261103-physics4';

export function createGameConfig(PhaserApi) {
  return {
    type: PhaserApi.AUTO,
    parent: 'phaser-root',
    width: 480,
    height: 270,
    backgroundColor: '#090d13',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: PhaserApi.Scale.FIT, autoCenter: PhaserApi.Scale.CENTER_BOTH, width: 480, height: 270 },
    physics: { default: 'arcade', arcade: { gravity: { y: 700 }, debug: false } },
    scene: [createBootScene(PhaserApi), createWorldScene(PhaserApi)]
  };
}
function boot() {
  if (!window.Phaser) {
    const error = document.getElementById('load-error');
    error.hidden = false;
    error.textContent = 'Не удалось загрузить Phaser. Проверьте подключение к интернету и обновите страницу.';
    return;
  }
  window.nocturneGame = new window.Phaser.Game(createGameConfig(window.Phaser));
}
if (typeof window !== 'undefined') {
  if (window.Phaser) boot(); else window.addEventListener('load', boot, { once: true });
}

