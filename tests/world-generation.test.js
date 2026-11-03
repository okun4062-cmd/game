import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld, TileId } from '../src/world/generateWorld.js';

test('isDeterministicForSameSeed and changesWithDifferentSeed', () => {
  const a = generateWorld('moon-7', { width: 720, height: 180 });
  const b = generateWorld('moon-7', { width: 720, height: 180 });
  const c = generateWorld('sun-2', { width: 720, height: 180 });
  assert.deepEqual(a.tiles, b.tiles);
  assert.deepEqual(a.dungeons, b.dungeons);
  assert.notDeepEqual(a.tiles, c.tiles);
});

test('fillsTwelveBiomes with one deterministic span per region', () => {
  const world = generateWorld('biomes');
  assert.equal(world.biomes.length, 12);
  assert.equal(new Set(world.biomes.map(b => b.id)).size, 12);
  assert.equal(world.biomes[0].startX, 0);
  assert.equal(world.biomes.at(-1).endX, world.width);
});

test('hasWalkableCaveRoute from surface through connected caves', () => {
  const world = generateWorld('cave-route', { width: 720, height: 180 });
  const start = [world.biomes[0].startX + 4, world.surfaceHeights[world.biomes[0].startX + 4] + 1];
  const goal = [world.dungeons.at(-1).x, world.dungeons.at(-1).y];
  const queue = [start];
  const seen = new Set([start.join(',')]);
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    if (x === goal[0] && y === goal[1]) return;
    for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
      const k = `${nx},${ny}`;
      if (nx >= 0 && nx < world.width && ny >= 0 && ny < world.height && !seen.has(k) && world.tiles[ny * world.width + nx] === TileId.AIR) { seen.add(k); queue.push([nx,ny]); }
    }
  }
  assert.fail('surface cave entrance does not connect to the last dungeon');
});

test('placesOneDungeonPerBiome', () => {
  const world = generateWorld('dungeons');
  assert.equal(world.dungeons.length, 12);
  assert.deepEqual(world.dungeons.map(d => d.biomeId), world.biomes.map(b => b.id));
  assert.equal(new Set(world.dungeons.map(d => d.id)).size, 12);
});

test('writesStayInsideBounds', () => {
  for (const options of [{ width: 360, height: 100 }, { width: 720, height: 180 }]) {
    const world = generateWorld(22, options);
    assert.equal(world.tiles.length, world.width * world.height);
    assert.ok(world.tiles.every(Number.isInteger));
    assert.ok(world.surfaceHeights.every(y => y >= 6 && y < world.height - 20));
    assert.ok(world.dungeons.every(d => d.x >= 0 && d.x < world.width && d.y >= 0 && d.y < world.height));
  }
});

test('hasMineableOreBesideConnectedCave', () => {
  const world = generateWorld('ore-veins', { width: 720, height: 180 });
  let found = false;
  for (let y=0; y<world.height && !found; y++) for(let x=0;x<world.width && !found;x++) {
    if(world.tiles[y*world.width+x]!==TileId.ORE) continue;
    if([[x+1,y],[x-1,y],[x,y+1],[x,y-1]].some(([nx,ny])=>nx>=0&&ny>=0&&nx<world.width&&ny<world.height&&world.tiles[ny*world.width+nx]===TileId.AIR)) found=true;
  }
  assert.ok(found, 'ore should be exposed to a walkable connected cave so the pistol is craftable');
});
