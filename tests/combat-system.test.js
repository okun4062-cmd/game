import test from 'node:test'; import assert from 'node:assert/strict'; import { primaryAction } from '../src/systems/CombatSystem.js';
const player = { x: 100, y: 50 };
test('meleeFacesPointer', () => { const p={...player};primaryAction({player:p,pointerWorld:{x:20,y:50}});assert.equal(p.facing,-1); });
test('meleeSelectsTargetWithoutDoubleApplyingDamage',()=>{const enemy={x:130,y:50,hp:40};const result=primaryAction({player:{...player},weapon:{kind:'melee',damage:15},pointerWorld:{x:160,y:50},enemies:[enemy]});assert.equal(result.target,enemy);assert.equal(result.damage,15);assert.equal(enemy.hp,40);});
test('projectileAimsAtWorldPointer',()=>{const a=primaryAction({player:{...player},weapon:{kind:'ranged',damage:7},pointerWorld:{x:100,y:150},inventory:{items:{ammo:2}}});assert.ok(Math.abs(a.vx)<.01);assert.ok(a.vy>0);});
test('rangedUsesOneAmmo',()=>{const inventory={items:{ammo:2}};primaryAction({player:{...player},weapon:{kind:'ranged'},pointerWorld:{x:120,y:50},inventory});assert.equal(inventory.items.ammo,1);});
