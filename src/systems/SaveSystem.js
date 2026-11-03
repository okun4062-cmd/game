import { createInventory } from './InventorySystem.js';
export const SAVE_KEY='nocturne.phaser.save.v1';
export const LEGACY_SAVE_KEY='nocturne-eclipse-save-v2';
export function freshSave(seed='nocturne'){return{version:1,seed:String(seed),player:{x:160,y:0,hp:100,maxHp:100},inventory:createInventory({materials:{wood:12,stone:8,ore:0,crystal:0},items:{ammo:40,potion:2}}),clearedDungeons:[],edits:{},discoveredBiomes:[]};}
function finiteCount(value){return Math.max(0,Math.min(999999,Number(value)||0));}
export const SaveSystem={
 load(raw,seed='nocturne'){
  if(!raw)return freshSave(seed);
  try{
   const value=typeof raw==='string'?JSON.parse(raw):raw;if(!value||typeof value!=='object')return freshSave(seed);
   if(value.version===1&&value.inventory&&Array.isArray(value.clearedDungeons)){const fallback=freshSave(value.seed||seed);return{...fallback,...value,player:{...fallback.player,...value.player},inventory:createInventory(value.inventory),edits:value.edits&&typeof value.edits==='object'?value.edits:{}};}
   // Prior site stored its save under nocturne-eclipse-save-v2 with forge.bag/owned/gear.
   const forge=value.forge||{};const bag=forge.bag||value.resources||value.materials||{};const materials={...bag,ore:bag.copper??bag.ore??0,crystal:bag.crystal??0};
   const owned=Array.isArray(forge.owned)?forge.owned:[];const gear={...(forge.gear||{})};
   const equipped=gear.weapon||value.equipped||value.weapon;
   const inventory=createInventory({materials,items:{...(value.items||{}),ammo:value.items?.ammo??bag.ammo??0},equipped,owned,legacyGear:gear});
   for(const [key,count]of Object.entries(bag)){if(key==='copper')continue;inventory.materials[key]=finiteCount(count);}
   inventory.materials.ore=finiteCount(bag.copper??bag.ore??0);inventory.materials.crystal=finiteCount(bag.crystal??0);
   const defeated=Math.max(0,Math.min(12,Number(value.defeated||value.bossesDefeated||0)));
   return{...freshSave(seed),inventory,clearedDungeons:Array.from({length:defeated},(_,i)=>`dungeon-${i+1}`)};
  }catch{return freshSave(seed);}
 },
 serialize(state){return JSON.stringify({...state,version:1});}
};

