import { generateWorld, TileId } from '../world/generateWorld.js?v=20261103-physics1';
import { ChunkManager } from '../world/ChunkManager.js';
import { createPixelChunk } from '../world/PixelTiles.js?v=20261103-physics1';
import { SaveSystem, SAVE_KEY, LEGACY_SAVE_KEY } from '../systems/SaveSystem.js';
import { primaryAction } from '../systems/CombatSystem.js';
import { createInventory, craft, equip, RECIPES, ITEMS, TOOLS } from '../systems/InventorySystem.js?v=20261103-ui1';
import { DungeonSystem } from '../systems/DungeonSystem.js';
import { BossSystem, GUARDIANS } from '../systems/BossSystem.js';

const TILE = 16;
export function createWorldScene(Phaser) {
 return class WorldScene extends Phaser.Scene {
  constructor(){super('WorldScene');}
  create(){
   const raw=localStorage.getItem(SAVE_KEY)||localStorage.getItem(LEGACY_SAVE_KEY);this.save=SaveSystem.load(raw);
   if(!raw)this.save=SaveSystem.load(null,`nocturne-${Math.floor(Math.random()*999999)}`);
   this.world=generateWorld(this.save.seed);this.chunks=new ChunkManager(this.world,32,this.save.edits);
   this.dungeons=new DungeonSystem(this.world.dungeons,this.save.clearedDungeons,ids=>{this.save.clearedDungeons=ids;this.persist();});
   const worldW=this.world.width*TILE,worldH=this.world.height*TILE;
   this.physics.world.setBounds(0,0,worldW,worldH);this.cameras.main.setBounds(0,0,worldW,worldH);this.cameras.main.setBackgroundColor('#111827');
   this.drawBackdrop();
   this.chunkSprites=new Map();
   this.makeSprites();
   this.inventory=createInventory(this.save.inventory);this.shots=[];this.boss=null;this.altarSprites=[];this.enemies=[];
   const tx=Math.max(2,Math.min(this.world.width-3,Math.floor((this.save.player.x||64*TILE)/TILE)));
   const px=Math.max(2*TILE,Math.min(worldW-2*TILE,this.save.player.x||64*TILE));
   const savedY=this.save.player.y;
   const freeAt=(x,y)=>{for(const [ox,oy] of [[-5,-9],[0,-9],[5,-9],[-5,12],[0,12],[5,12]]){const id=this.chunks.getTile(Math.floor((x+ox)/TILE),Math.floor((y+oy)/TILE));if(id!==TileId.AIR&&id!==TileId.WATER)return false;}return true;};
   const py=Number.isFinite(savedY)&&freeAt(px,savedY)?savedY:this.world.surfaceHeights[tx]*TILE-12;
   this.groundBodies=this.physics.add.staticGroup();this.rebuildTerrainCollision();
   this.player=this.physics.add.sprite(px,py,'wanderer-idle').setDepth(5).setCollideWorldBounds(true);this.player.body.setSize(12,22).setOffset(6,7);this.player.setMaxVelocity(180,700);this.player.setDragX(1600);this.player.hp=this.save.player.hp||100;
   this.physics.add.collider(this.player,this.groundBodies);
   this.player.takeDamage=amount=>{this.player.hp=Math.max(0,this.player.hp-amount);this.refreshHud();if(this.player.hp<=0){this.player.hp=100;this.player.setPosition(64*TILE,this.world.surfaceHeights[64]*TILE-12);this.player.setVelocity(0,0);this.showToast('Ты вернулся к костру.');}};
   this.harvestedTrees=new Set(this.save.harvestedTrees||[]);this.createTrees();this.createEnemies();this.createAltars();this.cameras.main.centerOn(this.player.x,this.player.y);this.loadChunks();this.cameras.main.startFollow(this.player,true,.12,.12);this.cameras.main.setDeadzone(96,42);
   this.keys=this.input.keyboard.addKeys('A,D,W,SPACE,LEFT,RIGHT,UP,F,ONE,TWO,THREE,FOUR,FIVE');
   this.input.keyboard.addCapture([Phaser.Input.Keyboard.KeyCodes.SPACE,Phaser.Input.Keyboard.KeyCodes.UP,Phaser.Input.Keyboard.KeyCodes.LEFT,Phaser.Input.Keyboard.KeyCodes.RIGHT]);
   this._jumpWasDown=false;
   this.touch={left:false,right:false,jump:false,mine:false};
   this.input.on('pointerdown',p=>{if(this.uiPanel)return;if(!p.leftButtonDown())return;const coarse=window.matchMedia?.('(pointer: coarse)').matches;if(coarse&&p.y>200&&(p.x<150||p.x>320))return;if(this.isMiningTool(this.inventory.selectedTool))this.mouseMining=true;else this.attackAtPointer(p);});
   this.input.on('pointerup',()=>{this.mouseMining=false;});this.input.on('pointerupoutside',()=>{this.mouseMining=false;});
   this._releaseMining=()=>{this.mouseMining=false;};window.addEventListener('pointerup',this._releaseMining);
   this.createHud();this.refreshHud();this.time.addEvent({delay:12000,loop:true,callback:()=>this.persist()});this.events.once('shutdown',()=>{this.persist();window.removeEventListener('pointerup',this._releaseMining);window.removeEventListener('nocturne:tool-select',this._onToolSelect);window.removeEventListener('nocturne:craft-select',this._onCraftSelect);window.removeEventListener('nocturne:craft',this._onCraft);window.removeEventListener('nocturne:panel',this._onPanel);});
  }
  loadChunks(){
   const view=this.cameras.main.worldView,margin=32*TILE;
   const bounds={x:view.x/TILE-32,y:view.y/TILE-32,width:(view.width+margin*2)/TILE,height:(view.height+margin*2)/TILE};
   const visible=this.chunks.getVisibleChunks(bounds),needed=new Set(visible.map(c=>`${c.x},${c.y}`));
   for(const [key,sprite] of this.chunkSprites){if(!needed.has(key)){sprite.destroy();this.chunkSprites.delete(key);this.textures.remove(`chunk-${key.replace(',','-')}`);}}
   for(const chunk of visible){const key=`${chunk.x},${chunk.y}`;if(this.chunkSprites.has(key))continue;const index=this.world.biomes.findIndex(b=>chunk.startX>=b.startX&&chunk.startX<b.endX);this.chunkSprites.set(key,createPixelChunk(this,this.chunks,chunk,index));}
  }
  rebuildTerrainCollision(){
   this.groundBodies.clear(true,true);
   const solid=(x,y)=>{const id=this.chunks.getTile(x,y);return id!==null&&id!==TileId.AIR&&id!==TileId.WATER;};
   const add=(x,y,w,h)=>this.groundBodies.create(x,y,'pixel-solid').setOrigin(.5).setDisplaySize(w,h).setVisible(false).refreshBody();
   const width=this.world.width,height=this.world.height;
   for(let y=0;y<height;y++){
    let start=-1;
    for(let x=0;x<=width;x++){
     const exposed=x<width&&solid(x,y)&&!solid(x,y-1);
     if(exposed&&start<0)start=x;
     if(!exposed&&start>=0){add((start+x)/2*TILE,y*TILE+1,(x-start)*TILE,2);start=-1;}
    }
   }
   for(let x=0;x<width;x++)for(const side of [-1,1]){
    let start=-1;
    for(let y=0;y<=height;y++){
     const exposed=y<height&&solid(x,y)&&!solid(x+side,y);
     if(exposed&&start<0)start=y;
     if(!exposed&&start>=0){const top=start,bottom=y-1,edge=side<0?x*TILE+1:(x+1)*TILE-1;add(edge,(top+(bottom-top)/2+.5)*TILE,2,(y-start)*TILE);start=-1;}
    }
   }
   for(let y=0;y<height;y++){
    let start=-1;
    for(let x=0;x<=width;x++){
     const exposed=x<width&&solid(x,y)&&!solid(x,y+1);
     if(exposed&&start<0)start=x;
     if(!exposed&&start>=0){add((start+x)/2*TILE,(y+1)*TILE-1,(x-start)*TILE,2);start=-1;}
    }
   }
  }
  drawBackdrop(){
   const g=this.add.graphics().setDepth(-5).setScrollFactor(.18);g.fillGradientStyle(0x182b42,0x182b42,0x29354a,0x29354a,1);g.fillRect(0,0,3000,800);
   for(let i=0;i<180;i++){g.fillStyle(i%9===0?0xf4dca4:0xc1d8f0,i%9===0?.8:.42);g.fillRect((i*197)%3000,(i*83)%660,2,2);}
   for(let i=0;i<30;i++){let x=i*105;g.fillStyle(0x192b35,1);g.fillTriangle(x,630,x+80,420+(i*29)%90,x+175,630);g.fillStyle(0x243a3e,.82);g.fillTriangle(x+20,630,x+105,474+(i*19)%100,x+195,630);}
  }
  makeSprites(){
   let g;
   if(!this.textures.exists('pixel-solid')){g=this.add.graphics();g.fillStyle(0xffffff);g.fillRect(0,0,1,1);g.generateTexture('pixel-solid',1,1);g.destroy();}
   const wanderer=(key,step=0,jump=false)=>{g=this.add.graphics();
    const cycle=step%4,bob=cycle===1||cycle===3?1:0,leftSwing=cycle===1?2:cycle===3?0:1,rightSwing=cycle===1?0:cycle===3?2:1;
    g.fillStyle(0x101820,.42);g.fillEllipse(12,30,13,3);
    g.fillStyle(0x26394a);g.fillRect(3,16+leftSwing,4,6);g.fillRect(17,16+rightSwing,4,6);
    g.fillStyle(0x202739);g.fillRect(6,15+bob,12,10);g.fillStyle(0x294052);g.fillRect(5,17+bob,14,7);
    g.fillStyle(0x567486);g.fillRect(6,16+bob,12,2);g.fillStyle(0xe5bc73);g.fillRect(6,22+bob,12,2);
    g.fillStyle(0x263241);g.fillRect(7+(cycle===1?2:cycle===3?-1:0),24,5,6);g.fillRect(13+(cycle===3?2:cycle===1?-1:0),24,5,6);
    if(jump){g.fillRect(5,27,5,2);g.fillRect(15,27,5,2);}else{g.fillRect(5+(cycle===1?3:cycle===3?-2:0),29,6,2);g.fillRect(14+(cycle===3?2:cycle===1?-3:0),29,6,2);}
    g.fillStyle(0x9e704e);g.fillRect(6+(cycle===1?3:cycle===3?-2:0),29,5,2);g.fillRect(14+(cycle===3?2:cycle===1?-3:0),29,5,2);
    g.fillStyle(0xd7aa83);g.fillRect(8,5,9,9);g.fillRect(6,8,2,4);g.fillRect(17,8,2,4);
    g.fillStyle(0x473332);g.fillRect(7,4,11,4);g.fillRect(6,7,3,4);g.fillRect(15,5,3,3);
    g.fillStyle(0xe8c4a0);g.fillRect(9,8,7,5);g.fillStyle(0x243443);g.fillRect(12,9,2,2);
    g.fillStyle(0x73e0d1);g.fillRect(8,14+bob,12,3);g.fillRect(18,13+bob,2,5);
    g.fillStyle(0xb8f4dc);g.fillRect(8,14,7,1);
    g.generateTexture(key,24,32);g.destroy();};
   if(!this.textures.exists('wanderer-idle')){wanderer('wanderer-idle');wanderer('wanderer-run-a',1);wanderer('wanderer-run-b',2);wanderer('wanderer-run-c',3);wanderer('wanderer-run-d',0);wanderer('wanderer-jump',0,true);}
   g=this.add.graphics();g.fillStyle(0xffffff);g.fillRect(4,1,16,20);g.fillStyle(0x2b1937);g.fillRect(6,5,12,11);g.fillStyle(0xffffff);g.fillRect(8,8,3,2);g.fillRect(14,8,3,2);g.generateTexture('guardian',24,24);g.destroy();
   g=this.add.graphics();g.fillStyle(0x60514a);g.fillRect(4,8,16,20);g.fillStyle(0xd3aa72);g.fillRect(7,4,10,6);g.fillStyle(0x86e9d7);g.fillRect(10,0,4,7);g.generateTexture('altar',24,28);g.destroy();
   g=this.add.graphics();g.fillStyle(0x405850);g.fillRoundedRect(1,7,22,12,5);g.fillStyle(0x7ed699);g.fillRect(5,8,4,3);g.fillRect(15,8,4,3);g.generateTexture('slime',24,20);g.destroy();
   g=this.add.graphics();g.fillStyle(0x354058);g.fillRect(8,5,8,12);g.fillStyle(0x8796c8);g.fillTriangle(10,8,0,2,8,13);g.fillTriangle(14,8,24,2,16,13);g.fillStyle(0xf0e7bd);g.fillRect(9,8,2,2);g.fillRect(14,8,2,2);g.generateTexture('bat',24,18);g.destroy();
   g=this.add.graphics();g.fillStyle(0x47e9d4);g.fillRect(1,2,8,4);g.fillStyle(0xc7fff3);g.fillRect(3,3,4,2);g.fillStyle(0x8bfff0,.55);g.fillRect(0,1,10,6);g.generateTexture('pixel-bolt',10,8);g.destroy();
   const colors=[0x92db78,0xe9a65e,0x92d7f2,0x70f2df,0x6ba8cb,0xc68cec,0xe7c77e,0x8bd58a,0x93b7ef,0xd5c1a1,0xe786d3,0x9e9afe];
   for(let i=0;i<12;i++){const key=`guardian-${i+1}`;if(this.textures.exists(key))continue;g=this.add.graphics();const c=colors[i];g.fillStyle(0x191722);g.fillRect(5,9,14,20);g.fillStyle(c);if(i%4===0){g.fillRect(2,4,20,14);g.fillRect(0,0,7,9);g.fillRect(17,0,7,9);g.fillRect(8,12,3,3);g.fillRect(15,12,3,3);}else if(i%4===1){g.fillRect(2,7,20,14);g.fillRect(-2,3,7,4);g.fillRect(19,3,7,4);g.fillRect(1,11,6,14);g.fillRect(17,11,6,14);}else if(i%4===2){g.fillRect(5,2,14,21);g.fillRect(1,8,5,14);g.fillRect(18,8,5,14);g.fillRect(10,8,4,7);}else{g.fillRect(4,5,16,14);g.fillRect(7,0,10,6);g.fillRect(1,14,22,5);g.fillRect(8,11,3,3);g.fillRect(15,11,3,3);}g.fillStyle(0xffffff);g.fillRect(8,11,3,2);g.fillRect(15,11,3,2);g.generateTexture(key,24,30);g.destroy();}
  }
  createTrees(){
   const canopy=[0x3e7653,0xc18a43,0x9bb6c7,0x4b8c75,0x9c4f51,0x8a735a,0x4b8a7b,0x477e9a,0x765c91,0x48a28c,0x8c929f,0x78566d];
   const light=[0x79a65d,0xe3b45b,0xc2d6df,0x78ac85,0xd77866,0xa38a6c,0x78b39f,0x71acc2,0xa68bc5,0x65c8a3,0xb9bdcf,0xb77da7];
   this.treeTargets=[];
   for(let x=10;x<this.world.width-8;){
    const ti=Math.min(11,Math.floor(x/(this.world.width/12)));
    if(this.harvestedTrees.has(`tree-${x}`)){const stump=this.add.graphics().setPosition(x*TILE,this.world.surfaceHeights[x]*TILE).setDepth(2);stump.fillStyle(0x584330);stump.fillRect(-4,-10,8,10);stump.fillStyle(0x9a7148);stump.fillRect(-3,-9,6,2);}
    else if(Math.abs(x*TILE-this.player.x)>80){
     const surface=this.world.surfaceHeights[x],g=this.add.graphics().setPosition(x*TILE,(surface-1)*TILE).setDepth(2),base=canopy[ti],hi=light[ti];
     g.fillStyle(0x342c29);g.fillRect(-2,-43,5,45);g.fillStyle(0x534037);g.fillRect(-1,-38,2,31);g.fillRect(-11,-35,11,2);g.fillRect(0,-32,12,2);
     for(let row=0;row<5;row++)for(let col=-4;col<=4;col++){
      const noise=(x*17+row*31+col*13+ti*7)%9,limit=row===0?2:row===1?4:row===2?4:row===3?3:2;
      if(Math.abs(col)>limit||noise===0)continue;
      const px=col*7,py=-72+row*8+(Math.abs(col)%2)*2;
      g.fillStyle(noise%4===0?hi:base);g.fillRect(px,py,8,8);
      if(noise%3===0){g.fillStyle(hi);g.fillRect(px+1,py+1,3,2);}
     }
     g.fillStyle(0xf0df98,.9);if(ti===3||ti===6||ti===9)for(let n=0;n<3;n++)g.fillRect(-13+n*10,-43+(n%2)*8,2,2);
     this.treeTargets.push({id:`tree-${x}`,x:x*TILE,y:surface*TILE-42,surface,graphic:g});
    }
    x+=18+((x*17+ti*31)%13);
   }
   // Small plants soften the ground line and help the player read the scale of the world.
   for(let x=6;x<this.world.width-6;x+=3){const surface=this.world.surfaceHeights[x],salt=(x*19)%17;if(salt>5||Math.abs(x*TILE-this.player.x)<80)continue;const g=this.add.graphics().setPosition(x*TILE,surface*TILE).setDepth(2);g.fillStyle(salt%2?0x7da966:0x87b37a);g.fillRect(-2,-5,1,5);g.fillRect(1,-4,1,4);g.fillRect(2,-2,2,2);if(salt===0){g.fillStyle(0xdab67d);g.fillRect(-1,-7,2,2);}
   }
  }
  createEnemies(){
   for(let i=0;i<12;i++){const biome=this.world.biomes[i],xTile=Math.min(biome.endX-12,biome.startX+24+(i*7)%19),deep=i%3===1,yTile=deep?Math.max(this.world.surfaceHeights[xTile]+8,Math.min(this.world.height-14,Math.floor(this.world.height*.62))):this.world.surfaceHeights[xTile]-1;const type=i%3===0?'bat':'slime',enemy=this.physics.add.sprite(xTile*TILE,yTile*TILE,type).setDepth(4);enemy.body.setAllowGravity(false);enemy.body.setSize(18,11);enemy.hp=46+i*3;enemy.attackClock=0;enemy.isBoss=false;enemy.setTint(i%2?0xffffff:0xc2efce);this.enemies.push(enemy);}
  }
  createAltars(){
   for(const d of this.world.dungeons){const x=d.x*TILE+8,y=d.y*TILE-14;const altar=this.add.image(x,y,'altar').setDepth(4).setTint(this.dungeons.isCleared(d.id)?0x56645d:0xffffff);altar.dungeon=d;this.altarSprites.push(altar);this.add.circle(x,y+10,26,0x59ead0,.07).setDepth(3);if(!this.dungeons.isCleared(d.id))this.add.text(x,y-30,'✧',{fontFamily:'monospace',fontSize:'12px',color:'#9dfff0'}).setOrigin(.5).setDepth(6);}
  }
  createHud(){
   this.selectedRecipe=0;this.uiPanel=null;this.mouseMining=false;this.touchMining=false;this.miningTarget=null;this.miningCracks=this.add.graphics().setDepth(4);
   this._onToolSelect=e=>this.selectTool(e.detail?.tool);
   this._onCraftSelect=e=>this.selectCraftRecipe(e.detail?.index||0);
   this._onCraft=()=>this.craftSelected();
   this._onPanel=e=>{this.uiPanel=e.detail?.panel||null;if(this.uiPanel){this.mouseMining=false;this.touchMining=false;}};
   window.addEventListener('nocturne:tool-select',this._onToolSelect);window.addEventListener('nocturne:craft-select',this._onCraftSelect);window.addEventListener('nocturne:craft',this._onCraft);window.addEventListener('nocturne:panel',this._onPanel);
   const coarse=window.matchMedia?.('(pointer: coarse)').matches;
   const pad=(x,y,label,down,up)=>{const box=this.add.rectangle(x,y,34,30,0x121a27,.78).setStrokeStyle(1,0xe2c990,.75).setScrollFactor(0).setDepth(52).setInteractive();const text=this.add.text(x,y,label,{fontFamily:'monospace',fontSize:'13px',color:'#f6e7c9'}).setOrigin(.5).setScrollFactor(0).setDepth(53);box.on('pointerdown',down);for(const e of ['pointerup','pointerupoutside','pointerout'])box.on(e,up);box.setVisible(!!coarse);text.setVisible(!!coarse);};
   pad(25,226,'◀',()=>this.touch.left=true,()=>this.touch.left=false);pad(66,226,'▶',()=>this.touch.right=true,()=>this.touch.right=false);pad(428,226,'▲',()=>this.touch.jump=true,()=>this.touch.jump=false);pad(108,226,'⛏',()=>this.touchMining=true,()=>this.touchMining=false);pad(382,226,'✧',()=>this.tryInteract(),()=>{});pad(382,184,'⚒',()=>this.tryCraft(),()=>{});
   this.input.keyboard.on('keydown-E',()=>this.tryInteract());this.input.keyboard.on('keydown-I',()=>this.tryPanel('inventory'));this.input.keyboard.on('keydown-C',()=>this.tryPanel('craft'));
   this.input.keyboard.on('keydown-ONE',()=>this.selectTool('pickaxe'));this.input.keyboard.on('keydown-TWO',()=>this.selectTool('axe'));this.input.keyboard.on('keydown-THREE',()=>this.selectTool('sword'));this.input.keyboard.on('keydown-FOUR',()=>this.selectTool('shovel'));this.input.keyboard.on('keydown-FIVE',()=>this.selectTool('pistol'));
   this.input.keyboard.on('keydown-UP',()=>{if(this.uiPanel==='craft')this.selectCraftRecipe(this.selectedRecipe-1);});this.input.keyboard.on('keydown-DOWN',()=>{if(this.uiPanel==='craft')this.selectCraftRecipe(this.selectedRecipe+1);});this.input.keyboard.on('keydown-ENTER',()=>{if(this.uiPanel==='craft')this.craftSelected();});this.input.keyboard.on('keydown-ESC',()=>{if(this.uiPanel)window.nocturneUI?.closePanel();});
  }
  selectCraftRecipe(index){this.selectedRecipe=(index+RECIPES.length)%RECIPES.length;this.refreshHud();}
  craftSelected(){
   const recipe=RECIPES[this.selectedRecipe];if(!craft(this.inventory,recipe.id)){this.showToast('Пока не хватает материалов для этого рецепта.');return;}
   if(recipe.id==='pistol')this.showToast('Пистолет создан. Выбери его в пятом слоте.');else if(recipe.id==='ammo')this.showToast('Созданы патроны ×20.');else if(recipe.id==='blade')this.showToast('Лунный клинок создан. Выбери меч и нажми 3.');else this.showToast('Зелье добавлено в сумку.');
   this.persist();this.refreshHud();
  }
  refreshHud(){
   if(!this.player||!window.nocturneUI)return;
   const x=Math.max(0,Math.min(this.world.width-1,Math.floor(this.player.x/TILE))),biome=this.world.biomes.find(b=>x>=b.startX&&x<b.endX);
   const state={hp:this.player.hp,maxHp:100,materials:this.inventory.materials,items:this.inventory.items,tools:this.inventory.tools,selectedTool:this.inventory.selectedTool,region:biome?.name||'NOCTURNE',dungeons:this.dungeons.exportCleared().length,recipes:RECIPES,toolList:TOOLS,boss:this.boss?.active?{name:this.boss.guardian.name,hp:this.boss.hp,maxHp:this.boss.maxHp}:null};
   window.__nocturneState=state;window.nocturneUI.update(state);
  }
  showToast(text){window.nocturneUI?.showToast(text);}
  attackAtPointer(pointer){
   const selected=this.inventory.selectedTool;if(selected!=='sword'&&selected!=='pistol')return;
   const target=this.cameras.main.getWorldPoint(pointer.x,pointer.y),id=selected==='pistol'?'pistol':this.inventory.equipped,ranged=id==='pistol';
   const result=primaryAction({player:this.player,weapon:ranged?{kind:'ranged',damage:22}:{kind:'melee',damage:id==='blade'?34:20,range:54},pointerWorld:target,enemies:[...this.enemies.filter(e=>e.active&&e.hp>0),...(this.boss?[this.boss]:[])],inventory:this.inventory});this.player.setFlipX(this.player.facing<0);this.player.facingAngle=Math.atan2(target.y-this.player.y,target.x-this.player.x);
   if(result.type==='empty'){this.showToast('Нет патронов — создай их в мастерской.');return;}
   if(result.type==='projectile'){const shot=this.physics.add.image(result.x,result.y,'pixel-bolt').setDepth(8);shot.setRotation(Math.atan2(result.vy,result.vx));shot.setVelocity(result.vx,result.vy);shot.body.setAllowGravity(false);shot.damage=result.damage;shot.life=2.2;this.shots.push(shot);}
   else{const slash=this.add.circle(this.player.x+result.direction.x*25,this.player.y+result.direction.y*14,15,0x8bf5e0,.7).setDepth(9);this.time.delayedCall(100,()=>slash.destroy());if(result.target){if(result.target.isBoss)this.hitBoss(result.damage);else this.hitEnemy(result.target,result.damage);}}
   this.refreshHud();
  }
  hitEnemy(enemy,damage){enemy.hp-=damage;enemy.setTint(0xffffff);this.time.delayedCall(80,()=>enemy.active&&enemy.clearTint());if(enemy.hp<=0){enemy.destroy();if(Math.random()<.55)this.inventory.materials.ore++;this.showToast('Тварь повержена · найдено немного руды.');this.persist();}}
  hitBoss(damage){if(!this.boss?.active)return;this.boss.hp-=damage;this.cameras.main.shake(70,.002);if(this.boss.hp<=0){const id=this.boss.dungeonId;this.boss.destroyGuardian();this.boss=null;this.dungeons.defeat(id);this.altarSprites.find(a=>a.dungeon.id===id)?.setTint(0x56645d);this.showToast('Страж повержен. Данж очищен навсегда.');this.persist();}}
  tryInteract(){const altar=this.altarSprites.find(a=>Math.hypot(a.x-this.player.x,a.y-this.player.y)<74);if(!altar){this.showToast('Найди светящийся алтарь глубоко в данже.');return;}if(this.dungeons.isCleared(altar.dungeon.id)){this.showToast('Данж очищен. Страж больше не появится.');return;}const def=this.dungeons.activate(altar.dungeon.id);if(!def)return;const guardian=GUARDIANS.find(b=>b.id===def.id);this.boss=BossSystem.spawn(this,guardian,altar.x+86,altar.y-12);this.boss.dungeonId=altar.dungeon.id;this.showToast(`Пробуждён страж: ${guardian.name}`);this.refreshHud();}
  tryCraft(){this.tryPanel('craft');}
  tryPanel(panel){if(!window.nocturneUI)return;window.nocturneUI.togglePanel(panel);}
  isMiningTool(id){return ['pickaxe','axe','shovel'].includes(id);}
  selectTool(id){
   if(!TOOLS.some(tool=>tool.id===id))return;
   if(id==='pistol'&&this.inventory.items.pistol<1){this.showToast('Сначала создай пистолет в мастерской.');return;}
   if(id==='pistol')equip(this.inventory,'pistol');
   if(id==='sword')equip(this.inventory,this.inventory.items.blade>0?'blade':'rusty-blade');
   this.inventory.selectedTool=id;this.mouseMining=false;this.miningTarget=null;this.miningCracks.clear();window.nocturneUI?.hideMining();
   this.showToast(`Выбрано: ${TOOLS.find(tool=>tool.id===id)?.name||id}`);this.persist();this.refreshHud();
  }
  miningPoint(){
   if(this.touchMining||this.keys.F.isDown)return{x:this.player.x+(this.player.flipX?-32:32),y:this.player.y+3};
   const pointer=this.input.activePointer;return this.cameras.main.getWorldPoint(pointer.x,pointer.y);
  }
  miningDuration(id){return id===TileId.GRASS ? .36 : id===TileId.SOIL ? .48 : id===TileId.STONE ? .92 : id===TileId.ORE ? 1.15 : id===TileId.CRYSTAL ? 1.3 : id===TileId.WOOD ? .7 : .8;}
  miningToolFor(id){return id===TileId.GRASS||id===TileId.SOIL?'shovel':id===TileId.WOOD?'axe':'pickaxe';}
  findMiningTarget(point){
   const tool=this.inventory.selectedTool;
   if(tool==='axe'){
    const tree=this.treeTargets.filter(t=>t.graphic.active&&Math.hypot(t.x-this.player.x,t.y-this.player.y)<104&&Math.hypot(t.x-point.x,t.y-point.y)<54).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0];
    if(tree)return{kind:'tree',...tree,id:TileId.WOOD,duration:.78};
   }
   const tx=Math.floor(point.x/TILE),ty=Math.floor(point.y/TILE),candidates=[[tx,ty],[tx+1,ty],[tx-1,ty],[tx,ty+1],[tx,ty-1]];
   for(const [x,y] of candidates){const id=this.chunks.getTile(x,y);if(id===null||id===TileId.AIR||id===TileId.WATER)continue;
    const cx=x*TILE+TILE/2,cy=y*TILE+TILE/2;if(Math.hypot(cx-this.player.x,cy-this.player.y)>104)continue;
    if(this.miningToolFor(id)!==tool)continue;
    return{kind:'tile',x,y,cx,cy,id,duration:this.miningDuration(id)};
   }
   return null;
  }
  drawMiningCracks(target,progress){
   const g=this.miningCracks;g.clear();if(!target||target.kind!=='tile')return;
   const stages=Math.floor(progress*4)+1,px=target.x*TILE,py=target.y*TILE;
   g.fillStyle(0x05090e,.12+progress*.22);g.fillRect(px+1,py+1,TILE-2,TILE-2);g.lineStyle(1,0xf1ead9,.8);
   const cracks=[[[6,0],[8,5],[5,8],[7,15]],[[14,2],[10,6],[12,9],[8,13]],[[0,9],[5,8],[8,10],[10,7]],[[15,8],[12,9],[10,7],[7,8]]];
   for(let i=0;i<Math.min(stages,cracks.length);i++){const path=cracks[(i+target.x+target.y)%cracks.length];for(let n=1;n<path.length;n++)g.lineBetween(px+path[n-1][0],py+path[n-1][1],px+path[n][0],py+path[n][1]);}
  }
  updateMining(delta){
   const active=this.mouseMining||this.touchMining||this.keys.F.isDown;
   if(!active||!this.isMiningTool(this.inventory.selectedTool)||this.uiPanel){this.miningTarget=null;this.miningCracks.clear();window.nocturneUI?.hideMining();return;}
   const target=this.findMiningTarget(this.miningPoint());
   if(!target){this.miningTarget=null;this.miningCracks.clear();window.nocturneUI?.hideMining();return;}
   if(!this.miningTarget||this.miningTarget.kind!==target.kind||this.miningTarget.x!==target.x||this.miningTarget.y!==target.y){this.miningTarget={...target,progress:0};}
   const mining=this.miningTarget;mining.progress=Math.min(1,mining.progress+delta/1000/mining.duration);this.drawMiningCracks(mining,mining.progress);
   window.nocturneUI?.showMining(mining.progress,mining.kind==='tree'?'Рубка дерева':`Добыча · ${this.miningLabel(mining.id)}`);
   if(mining.progress>=1)this.finishMining(mining);
  }
  miningLabel(id){return id===TileId.GRASS?'грунта':id===TileId.SOIL?'земли':id===TileId.STONE?'камня':id===TileId.ORE?'медной руды':id===TileId.CRYSTAL?'кристалла':'древесины';}
  finishMining(target){
   if(target.kind==='tree'){
    const tree=this.treeTargets.find(item=>item.id===target.id);tree?.graphic.destroy();this.harvestedTrees.add(target.id);this.inventory.materials.wood+=5;
    const stump=this.add.graphics().setPosition(target.x,target.surface*TILE).setDepth(2);stump.fillStyle(0x584330);stump.fillRect(-4,-10,8,10);stump.fillStyle(0x9a7148);stump.fillRect(-3,-9,6,2);
    this.spawnDebris(target.x,target.surface*TILE-30,0xa98254);this.showToast('Дерево срублено · древесина +5');
   }else{
    const current=this.chunks.getTile(target.x,target.y);if(current!==target.id){this.miningTarget=null;this.miningCracks.clear();window.nocturneUI?.hideMining();return;}
    this.chunks.setTile(target.x,target.y,TileId.AIR);
    if(target.id===TileId.ORE)this.inventory.materials.ore++;else if(target.id===TileId.CRYSTAL)this.inventory.materials.crystal++;else if(target.id===TileId.STONE)this.inventory.materials.stone++;else if(target.id===TileId.WOOD)this.inventory.materials.wood++;
    const color=target.id===TileId.CRYSTAL?0x6ee9d7:target.id===TileId.ORE?0xd5a363:target.id===TileId.STONE?0x929ca7:0x9a744e;
    this.spawnDebris(target.cx,target.cy,color);this.repaintChunk(target.x,target.y);this.rebuildTerrainCollision();this.showToast(`${this.miningLabel(target.id)} добыто`);
   }
   this.miningTarget=null;this.miningCracks.clear();window.nocturneUI?.hideMining();this.persist();this.refreshHud();
  }
  spawnDebris(x,y,color){
   for(let i=0;i<7;i++){const bit=this.add.rectangle(x+(Math.random()-.5)*12,y+(Math.random()-.5)*10,3+(i%2),3+(i%2),color).setDepth(7);this.tweens.add({targets:bit,x:bit.x+(Math.random()-.5)*35,y:bit.y-10-Math.random()*20,alpha:0,duration:280+Math.random()*220,ease:'Quad.easeOut',onComplete:()=>bit.destroy()});}
  }
  repaintChunk(x,y){
   const cx=Math.floor(x/32),cy=Math.floor(y/32),key=`${cx},${cy}`,chunk={x:cx,y:cy,startX:cx*32,startY:cy*32,width:Math.min(32,this.world.width-cx*32),height:Math.min(32,this.world.height-cy*32)};
   this.chunkSprites.get(key)?.destroy();this.chunkSprites.delete(key);this.textures.remove(`chunk-${cx}-${cy}`);
   const view=this.cameras.main.worldView;if(chunk.startX* TILE<view.x+view.width+TILE*32&&(chunk.startX+chunk.width)*TILE>view.x-TILE*32&&chunk.startY*TILE<view.y+view.height+TILE*32&&(chunk.startY+chunk.height)*TILE>view.y-TILE*32){const bi=this.world.biomes.findIndex(b=>x>=b.startX&&x<b.endX);this.chunkSprites.set(key,createPixelChunk(this,this.chunks,chunk,bi));}
  }
  isSolid(x,y){const id=this.chunks.getTile(x,y);return id!==null&&id!==TileId.AIR&&id!==TileId.WATER;}
  update(_,delta){
   this.loadChunks();
   const menuOpen=!!this.uiPanel;
   const dir=menuOpen?0:(this.keys.A.isDown||this.keys.LEFT.isDown||this.touch.left?-1:0)+(this.keys.D.isDown||this.keys.RIGHT.isDown||this.touch.right?1:0);
   const jumpDown=!menuOpen&&(this.keys.SPACE.isDown||this.keys.W.isDown||this.keys.UP.isDown||this.touch.jump);
   this.player.setVelocityX(dir*165);if(dir)this.player.setFlipX(dir<0);
   if(jumpDown&&!this._jumpWasDown&&this.player.body.blocked.down)this.player.setVelocityY(-355);
   this._jumpWasDown=jumpDown;
   const pose=!this.player.body.blocked.down?'wanderer-jump':dir?['wanderer-run-a','wanderer-run-b','wanderer-run-c','wanderer-run-d'][Math.floor(this.time.now/95)%4]:'wanderer-idle';
   if(this.player.texture.key!==pose)this.player.setTexture(pose);
   this.updateMining(delta);
   if(this.boss?.active)this.boss.update(this.player,delta);for(const e of this.enemies){if(!e.active)continue;e.attackClock+=delta;const dx=this.player.x-e.x,dy=this.player.y-e.y,distance=Math.hypot(dx,dy);if(distance<420){e.setVelocityX(Math.sign(dx)*48);e.y+=Math.sin(this.time.now/130+e.x)*.18;if(distance<25&&e.attackClock>1000){e.attackClock=0;this.player.takeDamage?.(5);}}else e.setVelocityX(Math.sin(this.time.now/500+e.x)*15);}
   for(const shot of this.shots){if(!shot.active)continue;shot.life-=delta/1000;if(shot.life<=0||this.isSolid(Math.floor(shot.x/TILE),Math.floor(shot.y/TILE))){shot.destroy();continue;}if(this.boss?.active&&Phaser.Math.Distance.Between(shot.x,shot.y,this.boss.x,this.boss.y)<24){this.hitBoss(shot.damage);shot.destroy();continue;}const target=this.enemies.find(e=>e.active&&e.hp>0&&Phaser.Math.Distance.Between(shot.x,shot.y,e.x,e.y)<18);if(target){this.hitEnemy(target,shot.damage);shot.destroy();}}
   this.shots=this.shots.filter(s=>s.active);if(this.player.y>this.world.height*TILE-80){this.player.hp=100;this.player.setPosition(64*TILE,this.world.surfaceHeights[64]*TILE-12);this.player.setVelocity(0,0);this.showToast('Тебя спасли у костра.');}this.refreshHud();
  }
  persist(){if(!this.player)return;this.save.player={x:this.player.x,y:this.player.y,hp:this.player.hp,maxHp:100};this.save.inventory=this.inventory||createInventory();this.save.edits=this.chunks?.exportEdits()||{};this.save.clearedDungeons=this.dungeons?.exportCleared()||[];this.save.harvestedTrees=[...(this.harvestedTrees||[])];try{localStorage.setItem(SAVE_KEY,SaveSystem.serialize(this.save));}catch{}}
 };
}
















