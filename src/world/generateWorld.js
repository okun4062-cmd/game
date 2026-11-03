export const TileId = Object.freeze({ AIR: 0, GRASS: 1, SOIL: 2, STONE: 3, ORE: 4, WATER: 5, WOOD: 6, CRYSTAL: 7 });

function seeded(seed) {
  let value = 2166136261;
  for (const char of String(seed)) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function generateWorld(seed = 'nocturne', options = {}) {
  const width = Math.max(360, Math.floor(options.width ?? 720));
  const height = Math.max(100, Math.floor(options.height ?? 180));
  const random = seeded(seed);
  const tiles = new Uint8Array(width * height);
  const surfaceHeights = new Int16Array(width);
  const regionWidth = width / 12;
  const biomeNames = ['Emerald Wilds', 'Amber Dunes', 'Frostveil', 'Mossfen', 'Crimson Reach', 'Ashen Vale', 'Moonlit Grove', 'Sunken Coast', 'Obsidian Crown', 'Crystal Hollow', 'Stormbreak', 'Ebon March'];
  const biomes = Array.from({ length: 12 }, (_, i) => ({ id: `biome-${i + 1}`, name: biomeNames[i], startX: Math.floor(i * regionWidth), endX: Math.floor((i + 1) * regionWidth), palette: i }));
  let surface = Math.floor(height * 0.34) + Math.floor(random() * 5);
  for (let x = 0; x < width; x++) {
    if (random() < 0.48) surface += random() < 0.5 ? -1 : 1;
    surface = Math.max(8, Math.min(Math.floor(height * 0.48), surface));
    surfaceHeights[x] = surface;
    for (let y = surface; y < height; y++) {
      tiles[y * width + x] = y === surface ? TileId.GRASS : (y < surface + 6 ? TileId.SOIL : TileId.STONE);
    }
  }

  const air = (x, y) => { if (x >= 0 && x < width && y >= 0 && y < height) tiles[y * width + x] = TileId.AIR; };
  const chamber = (cx, cy, rx, ry) => {
    for (let y = Math.max(0, cy - ry); y <= Math.min(height - 1, cy + ry); y++) {
      for (let x = Math.max(0, cx - rx); x <= Math.min(width - 1, cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1 + random() * 0.08) air(x, y);
      }
    }
  };

  const tunnelY = Math.min(height - 12, Math.max(Math.floor(height * 0.63), 62));
  let y = surfaceHeights[4] + 1;
  for (let x = 4; x < width - 4; x++) {
    const targetY = x < 20 ? Math.min(tunnelY, surfaceHeights[4] + (x - 4) * 2) : tunnelY + Math.round(Math.sin(x / 23) * 2);
    if (y < targetY) y++;
    else if (y > targetY) y--;
    chamber(x, y, 2, 2);
    if (random() < 0.025) chamber(x, y + Math.floor(random() * 6) - 2, 4 + Math.floor(random() * 4), 3 + Math.floor(random() * 3));
  }
  // A surface entrance joins the connected underground corridor.
  let entranceY = surfaceHeights[4] + 1;
  for (; entranceY <= tunnelY; entranceY++) chamber(4, entranceY, 1, 1);

  const dungeons = biomes.map((biome, i) => {
    const min = biome.startX + 8, max = biome.endX - 9;
    const x = Math.floor(min + random() * Math.max(1, max - min));
    const dungeonY = Math.min(height - 9, tunnelY + 4 + Math.floor(random() * Math.max(1, height - tunnelY - 14)));
    // Connect each unique guardian chamber to the main cave passage.
    for (let yy = Math.min(tunnelY, dungeonY); yy <= Math.max(tunnelY, dungeonY); yy++) chamber(x, yy, 2, 2);
    chamber(x, dungeonY, 8, 6);
    return { id: `dungeon-${i + 1}`, biomeId: biome.id, x, y: dungeonY, guardianId: `guardian-${i + 1}`, discovered: false };
  });

  // Organic side caves branch from the connected passage, with ore seams embedded in solid rock.
  for (let n = 0; n < Math.floor(width / 15); n++) {
    const cx = 8 + Math.floor(random() * (width - 16));
    const baseY = tunnelY + Math.floor(random() * Math.max(1, height - tunnelY - 9));
    for (let yy = tunnelY; yy <= baseY; yy++) { const bend = cx + Math.round(Math.sin(yy / 9 + n) * 2); chamber(bend, yy, 1, 1); }
    chamber(cx, baseY, 3 + Math.floor(random() * 6), 2 + Math.floor(random() * 4));
    if(n%4===0)for(let dx=-3;dx<=3;dx++){const wx=cx+dx,wy=baseY+2;if(wx>=0&&wx<width&&wy<height&&tiles[wy*width+wx]===TileId.AIR)tiles[wy*width+wx]=TileId.WATER;}
    for (let j = 0; j < 3; j++) {
      const ox = cx + Math.floor(random() * 13) - 6, oy = baseY + Math.floor(random() * 9) - 4;
      if (ox >= 0 && ox < width && oy >= 0 && oy < height && tiles[oy * width + ox] === TileId.STONE) tiles[oy * width + ox] = random() < 0.25 ? TileId.CRYSTAL : TileId.ORE;
    }
  }

  return { seed: String(seed), width, height, tiles, surfaceHeights, biomes, dungeons };
}





