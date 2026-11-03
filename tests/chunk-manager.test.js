import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../src/world/generateWorld.js';
import { ChunkManager } from '../src/world/ChunkManager.js';

test('visibleChunksStayInWorldBounds', () => {
  const world = generateWorld('chunks', { width: 360, height: 100 });
  const chunks = new ChunkManager(world, 32).getVisibleChunks({ x: -100, y: 50, width: 500, height: 500 });
  assert.ok(chunks.length > 0);
  assert.ok(chunks.every(c => c.x >= 0 && c.y >= 0 && c.x < Math.ceil(world.width / 32) && c.y < Math.ceil(world.height / 32)));
});

test('reloadRestoresEdits', () => {
  const world = generateWorld('edits', { width: 360, height: 100 });
  const a = new ChunkManager(world);
  a.setTile(15, 17, 7);
  const b = new ChunkManager(world, 32, a.exportEdits());
  assert.equal(b.getTile(15, 17), 7);
});

test('tileLookupMatchesGeneratedWorld', () => {
  const world = generateWorld('lookup', { width: 360, height: 100 });
  const chunks = new ChunkManager(world);
  assert.equal(chunks.getTile(4, 4), world.tiles[4 * world.width + 4]);
  assert.equal(chunks.getTile(-1, 0), null);
});
