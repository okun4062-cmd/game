import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGameConfig } from '../src/main.js';

const Phaser = {
  AUTO: 'AUTO',
  Scale: { FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH' },
  Scene: class Scene {}
};

test('usesPinnedPhaserVersion', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /phaser@4\.2\.1\/dist\/phaser\.min\.js/);
});

test('enablesCrispFitPixelRendering', () => {
  const config = createGameConfig(Phaser);
  assert.equal(config.type, 'AUTO');
  assert.equal(config.width, 480);
  assert.equal(config.height, 270);
  assert.equal(config.pixelArt, true);
  assert.equal(config.roundPixels, true);
  assert.equal(config.scale.mode, 'FIT');
  assert.equal(config.scale.autoCenter, 'CENTER_BOTH');
});
