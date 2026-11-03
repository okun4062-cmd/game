export const ITEMS = Object.freeze({
 wood:'Древесина', stone:'Камень', ore:'Медная руда', crystal:'Светокристалл',
 ammo:'Патроны', potion:'Зелье лечения'
});

export const TOOLS = Object.freeze([
 {id:'pickaxe',name:'Кирка',kind:'mine',for:'Камень, руда и кристаллы',key:'1'},
 {id:'axe',name:'Топор',kind:'mine',for:'Деревья и древесина',key:'2'},
 {id:'sword',name:'Меч',kind:'melee',for:'Ближний бой',key:'3'},
 {id:'shovel',name:'Лопата',kind:'mine',for:'Земля и трава',key:'4'},
 {id:'pistol',name:'Пистолет',kind:'ranged',for:'Выстрел в сторону курсора',key:'5',locked:true}
]);

export const RECIPES = Object.freeze([
 {id:'pistol',name:'Пистолет',cost:{wood:8,ore:12},kind:'ranged',damage:22},
 {id:'blade',name:'Лунный клинок',cost:{ore:8,crystal:3},kind:'melee',damage:34},
 {id:'ammo',name:'Патроны ×20',cost:{ore:2},amount:20},
 {id:'potion',name:'Зелье лечения',cost:{crystal:2},amount:1}
]);

export function createInventory(seed={}){
 const old=seed.materials||{};
 const materials={wood:0,stone:0,ore:0,crystal:0,...old};
 for(const [key,value] of Object.entries(materials))materials[key]=Math.max(0,Number(value)||0);
 const items={ammo:0,potion:0,pistol:0,blade:0,...(seed.items||{})};
 let equipped=['pistol','blade','rusty-blade'].includes(seed.equipped)?seed.equipped:'rusty-blade';
 if(seed.owned?.some(id=>/Repeater|Bow|gun|crossbow/i.test(id))){items.pistol=Math.max(1,items.pistol);if(equipped==='rusty-blade')equipped='pistol';}
 if(seed.owned?.some(id=>/Sword|blade/i.test(id))){items.blade=Math.max(1,items.blade);if(equipped==='rusty-blade')equipped='blade';}
 const tools=['pickaxe','axe','sword','shovel'];if(items.pistol>0||seed.tools?.includes('pistol'))tools.push('pistol');
 const selectedTool=TOOLS.some(tool=>tool.id===seed.selectedTool&&(!tool.locked||items.pistol>0))?seed.selectedTool:'sword';
 return {materials,items,equipped,selectedTool,tools,owned:[...(seed.owned||[])],legacyGear:{...(seed.legacyGear||{})}};
}

export function craft(inventory,recipeId){
 const recipe=RECIPES.find(r=>r.id===recipeId);
 if(!recipe||Object.entries(recipe.cost).some(([id,n])=>(inventory.materials[id]||0)<n))return false;
 for(const [id,n]of Object.entries(recipe.cost))inventory.materials[id]-=n;
 if(recipe.kind)inventory.items[recipe.id]=(inventory.items[recipe.id]||0)+1;
 else inventory.items[recipe.id]=(inventory.items[recipe.id]||0)+recipe.amount;
 if(recipe.id==='pistol'&&!inventory.tools.includes('pistol'))inventory.tools.push('pistol');
 return true;
}

export function equip(inventory,id){
 if(['pistol','blade'].includes(id)&&inventory.items[id]>0||id==='rusty-blade'){inventory.equipped=id;return true;}
 return false;
}

