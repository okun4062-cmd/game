import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGameConfig } from '../src/main.js';
class Scene { constructor(){} }
const Phaser={AUTO:'AUTO',Scale:{FIT:'FIT',CENTER_BOTH:'CENTER_BOTH'},Scene};
test('usesPinnedPhaserVersion',async()=>{const html=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/phaser@4\.2\.1\/dist\/phaser\.min\.js/);});
test('enablesCrispFitPixelRendering',()=>{const c=createGameConfig(Phaser);assert.equal(c.type,'AUTO');assert.equal(c.width,480);assert.equal(c.height,270);assert.equal(c.pixelArt,true);assert.equal(c.roundPixels,true);assert.equal(c.scale.mode,'FIT');assert.equal(c.scale.autoCenter,'CENTER_BOTH');assert.equal(c.scene.length,2);});
