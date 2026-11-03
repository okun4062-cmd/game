import { TileId } from './generateWorld.js';

const grass = ['#416d43', '#987643', '#8599aa', '#4d806e', '#944c4a', '#73604d', '#4d7b72', '#3d6780', '#705784', '#3c8b7a', '#777b8c', '#79566c'];
const soil = ['#604535', '#795330', '#56616c', '#3b574a', '#713c3d', '#57453a', '#3e5952', '#3c5662', '#50405e', '#2f6658', '#4c515d', '#523a50'];
const rock = ['#3b4149', '#665642', '#4b5a69', '#354c49', '#57383a', '#48423f', '#35484b', '#344a59', '#433b4f', '#31594e', '#484d5a', '#493746'];

function hash(x, y, salt = 0) {
  let n = Math.imul(x + 173 * salt, 374761393) + Math.imul(y + 97 * salt, 668265263);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return (n ^ n >>> 16) >>> 0;
}

function fleck(ctx, x, y, color, seed, count, size = 2) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const n = hash(x + i * 7, y - i * 3, seed);
    const px = n % 13, py = (n >>> 8) % 13;
    ctx.fillRect(x + px, y + py, size + (n % 3 === 0 ? 1 : 0), 1 + (n % 2));
  }
}

function drawTile(ctx, id, x, y, worldX, worldY, biome, scale) {
  const salt = hash(worldX, worldY, biome);
  const shade = (salt >>> 11) % 18;
  const tint = (base) => `rgba(${base},${base},${base},0.08)`;
  if (id === TileId.WATER) {
    ctx.fillStyle = '#163c56'; ctx.fillRect(x, y, scale, scale);
    ctx.fillStyle = '#4592ae'; ctx.fillRect(x + 1, y + 2 + (salt % 3), 8 + salt % 5, 1);
    ctx.fillStyle = '#98dece'; ctx.fillRect(x + (salt >>> 6) % 12, y + 1, 3, 1);
    ctx.fillStyle = 'rgba(4,14,24,.35)'; ctx.fillRect(x, y + 10, scale, scale - 10);
    return;
  }

  const base = id === TileId.GRASS ? grass[biome] : id === TileId.SOIL ? soil[biome] : id === TileId.STONE ? rock[biome] : id === TileId.ORE ? '#5d5148' : id === TileId.CRYSTAL ? '#355d65' : '#805e36';
  ctx.fillStyle = base; ctx.fillRect(x, y, scale, scale);
  ctx.fillStyle = tint(255); ctx.fillRect(x, y, scale, 1 + (shade > 14 ? 1 : 0));
  ctx.fillStyle = 'rgba(6,10,15,.20)'; ctx.fillRect(x, y + scale - 2, scale, 2);
  ctx.fillStyle = 'rgba(0,0,0,.11)'; ctx.fillRect(x + scale - 2, y + 2, 2, scale - 4);

  if (id === TileId.GRASS) {
    ctx.fillStyle = grass[biome]; ctx.fillRect(x, y, scale, 4);
    ctx.fillStyle = ['#a2c978', '#d4af69', '#b5cbd4', '#91bf90', '#e09b76', '#b7a083', '#9fc6ac', '#8ebbd0', '#bfa6dc', '#7ce0bd', '#b7b8c8', '#bd91ad'][biome];
    ctx.fillRect(x, y, scale, 2); ctx.fillRect(x + ((salt >>> 5) % 10), y - 1, 2 + salt % 4, 2);
    if ((salt & 7) === 0) { ctx.fillRect(x + 3, y - 3, 1, 3); ctx.fillRect(x + 10, y - 2, 1, 2); }
    fleck(ctx, x, y + 4, 'rgba(10,20,18,.22)', biome + 2, 2, 2);
  } else if (id === TileId.SOIL) {
    fleck(ctx, x, y, 'rgba(235,207,161,.24)', biome + 4, 3, 2);
    fleck(ctx, x, y, 'rgba(18,13,12,.22)', biome + 8, 2, 2);
    if ((salt % 5) === 0) { ctx.fillStyle = 'rgba(24,18,16,.26)'; ctx.fillRect(x + 5, y + 6, 5, 1); ctx.fillRect(x + 9, y + 6, 1, 3); }
  } else if (id === TileId.STONE) {
    ctx.fillStyle = 'rgba(220,225,226,.14)'; ctx.fillRect(x + 2, y + 3, 5 + salt % 4, 1); ctx.fillRect(x + 2, y + 3, 1, 3);
    fleck(ctx, x, y, 'rgba(230,239,240,.23)', biome + 5, 2, 2);
    fleck(ctx, x, y, 'rgba(4,7,12,.27)', biome + 9, 2, 2);
  } else if (id === TileId.ORE) {
    fleck(ctx, x, y, '#b5794b', biome + 13, 4, 2);
    ctx.fillStyle = '#e8c486'; ctx.fillRect(x + 4, y + 4, 3, 2); ctx.fillRect(x + 9, y + 7, 3, 2);
    ctx.fillStyle = '#f6ddb0'; ctx.fillRect(x + 5, y + 4, 1, 1);
  } else if (id === TileId.CRYSTAL) {
    ctx.fillStyle = 'rgba(92,245,221,.16)'; ctx.fillRect(x, y, scale, scale);
    ctx.fillStyle = '#65e7db'; ctx.fillRect(x + 5, y + 2, 3, 10); ctx.fillRect(x + 8, y + 4, 4, 7);
    ctx.fillStyle = '#d2fff0'; ctx.fillRect(x + 6, y + 3, 1, 3); ctx.fillRect(x + 9, y + 5, 1, 2);
  } else if (id === TileId.WOOD) {
    ctx.fillStyle = '#c69456'; ctx.fillRect(x + 4, y, 2, scale); ctx.fillRect(x + 11, y, 1, scale);
    ctx.fillStyle = 'rgba(30,18,12,.3)'; ctx.fillRect(x, y + 5, scale, 1); ctx.fillRect(x, y + 13, scale, 1);
  }
}

export function createPixelChunk(scene, manager, chunk, biomeIndex) {
  const scale = 16;
  const key = `chunk-${chunk.x}-${chunk.y}`;
  const texture = scene.textures.createCanvas(key, chunk.width * scale, chunk.height * scale);
  const ctx = texture.getContext();
  for (let y = 0; y < chunk.height; y++) for (let x = 0; x < chunk.width; x++) {
    const id = manager.getTile(chunk.startX + x, chunk.startY + y);
    if (id !== TileId.AIR) drawTile(ctx, id, x * scale, y * scale, chunk.startX + x, chunk.startY + y, biomeIndex % grass.length, scale);
  }
  texture.refresh();
  return scene.add.image(chunk.startX * scale, chunk.startY * scale, key).setOrigin(0).setDepth(1);
}

