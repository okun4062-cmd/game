import test from 'node:test'; import assert from 'node:assert/strict'; import { DungeonSystem } from '../src/systems/DungeonSystem.js';
const dungeons=[{id:'d1',guardianId:'g1'},{id:'d2',guardianId:'g2'}];
test('altarAwakensGuardianOnce',()=>{const d=new DungeonSystem(dungeons);assert.equal(d.activate('d1').id,'g1');assert.equal(d.activate('d1'),null);});
test('oneGuardianAtATime',()=>{const d=new DungeonSystem(dungeons);d.activate('d1');assert.equal(d.activate('d2'),null);});
test('clearedDungeonDoesNotRespawn',()=>{let persisted;const d=new DungeonSystem(dungeons,[],ids=>persisted=ids);d.activate('d1');assert.equal(d.defeat('d1'),true);assert.deepEqual(persisted,['d1']);assert.equal(d.activate('d1'),null);});
test('unknownDungeonIsIgnored',()=>{const d=new DungeonSystem(dungeons);assert.equal(d.activate('nope'),null);assert.equal(d.defeat('nope'),false);});
