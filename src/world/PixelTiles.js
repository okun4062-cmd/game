import { TileId } from './generateWorld.js';
const palette = ['#315b37', '#a67937', '#7896a7', '#47766b', '#8b4245', '#665647', '#416a67', '#345a72', '#5b426f', '#358776', '#6b6d83', '#593d59'];

export function createPixelChunk(scene, manager, chunk, biomeIndex) {
  const scale = 16;
  const texture = scene.textures.createCanvas(`chunk-${chunk.x}-${chunk.y}`, chunk.width * scale, chunk.height * scale);
  const ctx = texture.getContext();
  const accent = palette[biomeIndex % palette.length];
  const rgb = accent.match(/[\da-f]{2}/gi).map(x => parseInt(x, 16));
  for (let y = 0; y < chunk.height; y++) for (let x = 0; x < chunk.width; x++) {
    const id = manager.getTile(chunk.startX + x, chunk.startY + y);
    if (id === TileId.AIR) continue;
    const px = x * scale, py = y * scale;
    let fill = id === TileId.GRASS ? accent : id === TileId.SOIL ? '#513a30' : id === TileId.STONE ? '#39414a' : id === TileId.ORE ? '#c28a55' : id === TileId.CRYSTAL ? '#7de5da' : id === TileId.WATER ? '#3977a3' : '#8d6337';
    ctx.fillStyle = fill;
    ctx.fillRect(px, py, scale, scale);
    ctx.fillStyle = id === TileId.GRASS ? '#91b86a' : 'rgba(10,14,20,.28)';
    if (id === TileId.GRASS) ctx.fillRect(px, py, scale, 3);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    const hash = (chunk.startX + x * 13 + chunk.startY + y * 7) % 11;
    if (hash < 4) ctx.fillRect(px + (hash * 3) % 13, py + (hash * 5) % 13, 2, 2);
    if (id === TileId.ORE || id === TileId.CRYSTAL) {
      ctx.fillStyle = id === TileId.ORE ? '#f1c47a' : '#b8fff1';
      ctx.fillRect(px + 5, py + 4, 5, 7); ctx.fillRect(px + 9, py + 8, 3, 3);
    }
    if (id === TileId.GRASS) {
      ctx.fillStyle = 'rgba(15,27,22,.3)'; ctx.fillRect(px, py + scale - 2, scale, 2);
    }
  }
  texture.refresh();
  return scene.add.image(chunk.startX * scale, chunk.startY * scale, texture.key).setOrigin(0).setDepth(1);
}
