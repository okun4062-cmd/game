/* NOCTURNE III · FORGE & DEEP MINE.
 * Standalone systems module; game loop is in index.html.
 * Only uses Canvas 2D + DOM. Suitable for GitHub Pages.
 */
(function(){
'use strict';
window.NocturneForge = function(e){
  const TS=16,MAX_DEPTH=172,MAX_REMOVED=12000;
  const names={stone:'Камень',wood:'Древесина',copper:'Медная руда',iron:'Железная руда',coal:'Уголь',
    gold:'Золото',crystal:'Кристаллы',void:'Тёмная руда',essence:'Эссенция',tonic:'Эликсиры'};
  const icons={stone:'🪨',wood:'🪵',copper:'🟠',iron:'⚙',coal:'◼',gold:'🟡',crystal:'💎',
    void:'🔮',essence:'✨',tonic:'🧪'};
  const materials=['stone','wood','copper','iron','coal','gold','crystal','void','essence','tonic'];
  const recipes=[
    {id:'copperSword',name:'Медный меч',icon:'🗡️',slot:'weapon',stat:5,cost:{copper:9,wood:5}},
    {id:'ironSword',name:'Железный клеймор',icon:'⚔️',slot:'weapon',stat:9,cost:{iron:14,copper:7,wood:4}},
    {id:'crystalSword',name:'Кристальный клинок',icon:'💠',slot:'weapon',stat:15,cost:{crystal:12,iron:16,gold:7}},
    {id:'voidSword',name:'Меч Бездны',icon:'🌌',slot:'weapon',stat:23,cost:{void:16,crystal:20,gold:12}},
    {id:'stoneArmor',name:'Каменная броня',icon:'🛡',slot:'armor',stat:1,cost:{stone:18,wood:8}},
    {id:'copperArmor',name:'Медная кираса',icon:'🥉',slot:'armor',stat:2,cost:{copper:13,stone:12}},
    {id:'ironArmor',name:'Железная броня',icon:'🦾',slot:'armor',stat:4,cost:{iron:22,copper:8,coal:6}},
    {id:'crystalArmor',name:'Кристальный доспех',icon:'💎',slot:'armor',stat:7,cost:{crystal:15,iron:12,gold:10}},
    {id:'voidArmor',name:'Броня Бездны',icon:'👑',slot:'armor',stat:11,cost:{void:19,crystal:18,gold:14}},
    {id:'copperPick',name:'Медная кирка',icon:'⛏️',slot:'pick',stat:2,cost:{copper:8,wood:6}},
    {id:'ironPick',name:'Железная кирка',icon:'⚒️',slot:'pick',stat:3,cost:{iron:12,copper:7,coal:5}},
    {id:'crystalPick',name:'Кристальная кирка',icon:'🔨',slot:'pick',stat:4,cost:{crystal:10,iron:10,gold:5}},
    {id:'voidPick',name:'Кирка Бездны',icon:'🔱',slot:'pick',stat:5,cost:{void:15,crystal:14,gold:8}},
    {id:'tonic',name:'Целебный эликсир',icon:'🧪',slot:'consumable',stat:4,cost:{essence:7,crystal:2,coal:2}}
  ];
  const oreDef={
    dirt: {color:'#584b4a',top:'#70605d',weight:1,hard:1,drop:'stone',req:1},
    stone:{color:'#465064',top:'#67738a',weight:2,hard:2,drop:'stone',req:1},
    coal: {color:'#343442',top:'#77798a',weight:2,hard:2,drop:'coal',req:1},
    copper:{color:'#574953',top:'#e1a072',weight:3,hard:3,drop:'copper',req:1},
    iron: {color:'#465261',top:'#bbc7d4',weight:4,hard:4,drop:'iron',req:2},
    gold: {color:'#675347',top:'#f7d37b',weight:5,hard:5,drop:'gold',req:3},
    crystal:{color:'#3c405e',top:'#b5bfff',weight:6,hard:6,drop:'crystal',req:3},
    void: {color:'#353045',top:'#ef86e6',weight:7,hard:8,drop:'void',req:4},
    bedrock:{color:'#20212d',top:'#4d4755',weight:9,hard:999,drop:null,req:99}
  };
  let bag={},owned=new Set(),gear={},miningXP=0,stats={mobs:0,blocks:0,bosses:0};
  let inMine=false,inventoryOpen=false,activeTab='recipes',surface=null,mineZone=0;
  let mineCameraY=0,mineCameraX=0,removed=new Set(),tileDamage=new Map(),minedCount=0;
  let mineEnemies=[],mineMobSpawnTick=0,surfaceNodeCooldown=new Map(),geodeCooldown=new Map();
  let digCd=0,digProgress=0,digTarget='',mineSparks=[],hintText='',hintTicks=0;
  let lastZone=0;
  const panel=document.getElementById('forgePanel');
  const grid=document.getElementById('forgeGrid');
  const tabs=[...document.querySelectorAll('.forge-tab')];
  const mineBtn=document.getElementById('forgeMine');
  const bagBtn=document.getElementById('forgeInventory');
  const closeBtn=document.getElementById('forgeClose');
  const statusEl=document.getElementById('forgeStatus');
  const mineHint=document.getElementById('mineHint');
  const portalHint=document.getElementById('forgePortalHint');
  const shell=document.getElementById('shell');
  const portalX=z=>z*e.ZONE+128;

  function defaultBag(){return {stone:0,wood:22,copper:0,iron:0,coal:0,gold:0,crystal:0,void:0,essence:0,tonic:0}}
  function fresh(){
    bag=defaultBag();owned.clear();
    gear={weapon:'starter',armor:'cloth',pick:'hand'};
    miningXP=0;stats={mobs:0,blocks:0,bosses:0};removed=new Set();
    tileDamage.clear();surfaceNodeCooldown.clear();geodeCooldown.clear();
    minedCount=0;mineZone=0;inMine=false;surface=null;mineEnemies=[];
    inventoryOpen=false;panel.hidden=true;shell.classList.remove('in-mine');
    updateLabels();
  }
  function snapshot(){
    return {bag:{...bag},owned:[...owned],gear:{...gear},xp:miningXP,stats:{...stats},
      removed:[...removed].slice(-MAX_REMOVED),mineZone,blocks:minedCount};
  }
  function restore(value){
    if(!value||typeof value!=='object')return;
    const old=defaultBag();
    for(const k of materials)old[k]=Math.max(0,Math.min(999999,Number(value.bag?.[k])||0));
    bag=old;owned=new Set((value.owned||[]).filter(id=>recipes.some(r=>r.id===id)));
    gear={weapon:'starter',armor:'cloth',pick:'hand',...(value.gear||{})};
    for(const slot of ['weapon','armor','pick']){
      if(!['starter','cloth','hand'].includes(gear[slot])&&!owned.has(gear[slot]))gear[slot]={weapon:'starter',armor:'cloth',pick:'hand'}[slot];
    }
    miningXP=Math.max(0,Number(value.xp)||0);stats={mobs:0,blocks:0,bosses:0,...(value.stats||{})};
    removed=new Set(Array.isArray(value.removed)?value.removed.slice(-MAX_REMOVED):[]);
    minedCount=Math.max(0,Number(value.blocks)||0);
    mineZone=Math.max(0,Number(value.mineZone)||0);
    inventoryOpen=false;inMine=false;panel.hidden=true;shell.classList.remove('in-mine');
    updateLabels();
  }
  function itemStat(id){return recipes.find(r=>r.id===id)?.stat||0}
  function weaponDamage(){return gear.weapon==='starter'?2:itemStat(gear.weapon)}
  function armorValue(){return gear.armor==='cloth'?0:itemStat(gear.armor)}
  function pickTier(){return gear.pick==='hand'?1:itemStat(gear.pick)}
  function mineLevel(){return 1+Math.floor(Math.sqrt(miningXP/18))}
  function effectiveBossDamage(base,level){
    return Math.max(1,base+Math.floor(Math.max(0,level)/2)-armorValue());
  }
  function updateLabels(){
    statusEl.textContent='⚔ '+weaponDamage()+' · 🛡 '+armorValue()+' · ⛏ '+pickTier();
    mineBtn.querySelector('span').textContent=inMine?'На поверхность':'В шахту';
    document.getElementById('forgeHudMine').title=inMine?'На поверхность':'В шахту';
    shell.classList.toggle('in-mine',inMine);
    if(inMine)document.getElementById('zoneLabel').textContent='ШАХТА · '+e.biome(mineZone).name;
  }
  function add(item,n=1,quiet=false){
    if(!materials.includes(item))return;
    bag[item]=Math.max(0,(bag[item]||0)+n);
    if(!quiet){e.notif('+'+n+' · '+names[item]);e.sfx(600,.07,'sine',.025)}
    updateLabels();
    if(inventoryOpen)renderTab();
  }
  function canCraft(r){return Object.entries(r.cost).every(([k,n])=>(bag[k]||0)>=n)}
  function craft(id){
    const r=recipes.find(v=>v.id===id);if(!r)return;
    if(r.slot!=='consumable'&&owned.has(id)){e.notif('Предмет уже создан');return}
    if(!canCraft(r)){e.notif('Не хватает ресурсов');return}
    for(const [k,n] of Object.entries(r.cost))bag[k]-=n;
    if(r.slot==='consumable')bag.tonic++;
    else{owned.add(id);const prev=r.slot==='weapon'?weaponDamage():r.slot==='armor'?armorValue():pickTier();
      if(r.stat>=prev)gear[r.slot]=id;
      if(r.slot==='armor'&&e.player()){
        const p=e.player(),oldMax=p.max;
        p.max=6+Math.floor(armorValue()*.75);
        p.hp=Math.min(p.max,p.hp+Math.max(0,p.max-oldMax));
      }
    }
    e.notif('✦ СОЗДАНО: '+r.name);e.sfx(700,.21,'sine',.045);
    updateLabels();renderTab();e.save();
  }
  function equip(id){
    const r=recipes.find(v=>v.id===id);if(!r||!owned.has(id)||r.slot==='consumable')return;
    const prevMax=e.player()?.max||6;
    gear[r.slot]=id;
    if(r.slot==='armor'&&e.player()){
      const p=e.player();p.max=6+Math.floor(armorValue()*.75);
      p.hp=Math.min(p.max,p.hp+Math.max(0,p.max-prevMax));
    }
    e.notif('Снаряжено: '+r.name);renderTab();updateLabels();e.save();
  }
  function useTonic(){
    const p=e.player();
    if((bag.tonic||0)<1||!p||p.hp>=p.max||e.mode()!=='play')return false;
    bag.tonic--;p.hp=Math.min(p.max,p.hp+4);
    e.particle(p.x+6,p.y+8,30,'#99f8c8',2);e.notif('🧪 +4 здоровья');e.sfx(660,.18,'sine');
    renderTab();e.save();return true;
  }
  function costHtml(cost){
    return Object.entries(cost).map(([k,n])=>'<span style="color:'+(bag[k]>=n?'#aee8c4':'#ffb3b8')+'">'+icons[k]+' '+(bag[k]||0)+'/'+n+'</span>').join(' · ');
  }
  function renderTab(){
    if(!inventoryOpen)return;
    for(const b of tabs)b.classList.toggle('active',b.dataset.tab===activeTab);
    const stat='<div class="forge-stats">'+[
      ['Урон',weaponDamage()],['Броня',armorValue()],['Кирка',pickTier()],['Шахтёр',mineLevel()],['Блоков',stats.blocks]
    ].map(([n,v])=>'<div class="forge-stat"><span>'+n+'</span><strong>'+v+'</strong></div>').join('')+'</div>';
    if(activeTab==='bag'){
      grid.innerHTML=stat+'<p class="forge-tip">Все найденные ресурсы — твои. Камень и руды добывай киркой в бесконечной шахте, эссенцию — с врагов.</p>'+
      '<div class="forge-grid">'+materials.map(id=>'<div class="forge-item"><div class="symbol">'+icons[id]+'</div><div><div class="title">'+names[id]+'</div><div class="amount">× '+(bag[id]||0)+'</div></div></div>').join('')+'</div>'+
      '<div class="forge-log">Собрано ресурсов: '+Object.values(bag).reduce((a,b)=>a+b,0)+' · Побеждено врагов: '+stats.mobs+'</div>';
    }else if(activeTab==='recipes'){
      grid.innerHTML=stat+'<p class="forge-tip">Крафт оружия, брони, кирок и зелий. Снаряжение применяется сразу. Для редких руд нужна более сильная кирка.</p>'+
      '<div class="forge-recipe-grid">'+recipes.map(r=>{
       const done=owned.has(r.id),on=gear[r.slot]===r.id && r.slot!=='consumable';
       return '<article class="forge-recipe"><div class="forge-recipe-top"><div class="forge-recipe-icon">'+r.icon+'</div><div><h3>'+r.name+'</h3><small>'+
        (r.slot==='weapon'?'Урон '+r.stat:r.slot==='armor'?'Защита '+r.stat:r.slot==='pick'?'Сила кирки '+r.stat:'Лечение +'+r.stat)+'</small></div></div>'+
        '<div class="cost">'+costHtml(r.cost)+'</div><button data-craft="'+r.id+'" '+((!canCraft(r)||done)?'disabled':'')+'>'+
        (done?(on?'✓ Надето':'Уже создано'):'Создать')+'</button>'+
        (done&&!on&&r.slot!=='consumable'?'<button class="equip" data-equip="'+r.id+'">Надеть</button>':'')+'</article>';
      }).join('')+'</div>';
    }else{
      grid.innerHTML=stat+'<p class="forge-tip">⛏ ОГРОМНАЯ БЕСКОНЕЧНАЯ ШАХТА — горизонтально без конца, до 172 каменных слоёв в глубину.</p>'+
      '<div class="forge-log">'+
      '1. Нажми «В шахту» или E возле входа. Можно входить из любого мира.<br>'+
      '2. A/D — движение, SPACE — двойной прыжок. Удерживай F или кнопку ⛏ для копания.<br>'+
      '3. Зажми S / ▼ и копай, чтобы рыть вниз. Чтобы копать наверх, зажми W / ↑.<br>'+
      '4. Медная руда → медная кирка → железная → кристальная → кирка Бездны.<br>'+
      '5. В пещерах есть богатые жилы, светящиеся гроты и подземные враги.<br>'+
      '6. Руды можно продавать только крафту — улучшай клинок и броню перед следующими боссами.<br>'+
      '7. Боссы получают больше здоровья и урона после каждого мира.<br>'+
      '8. R — выпить эликсир, I — открыть/закрыть сумку. Прогресс шахты сохраняется.<br><br>'+
      'Урон от босса (до брони): '+(1+Math.floor(e.defeated()/2))+' · Защита: '+armorValue()+
      '</div><div class="forge-notice">⚒ Текущая глубина: '+(inMine?Math.max(0,Math.floor(e.player().y/16)-9):0)+' · Уровень шахтёра '+mineLevel()+'</div>';
    }
  }
  function open(tab='recipes'){
    if(e.mode()!=='play'){e.notif('Сначала начни игру');return}
    inventoryOpen=true;activeTab=tab;panel.hidden=false;renderTab();
    for(const k of Object.keys(e.keys))e.keys[k]=0;
  }
  function close(){
    inventoryOpen=false;panel.hidden=true;
    for(const k of Object.keys(e.keys))e.keys[k]=0;
    for(const k of Object.keys(e.pressed))e.pressed[k]=0;
  }
  function toggle(){inventoryOpen?close():open()}
  tabs.forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.tab;renderTab()}));
  grid.addEventListener('click',ev=>{
    const b=ev.target.closest('button');if(!b)return;
    if(b.dataset.craft)craft(b.dataset.craft);
    if(b.dataset.equip)equip(b.dataset.equip);
  });
  bagBtn.addEventListener('click',()=>open('bag'));
  closeBtn.addEventListener('click',close);
  document.getElementById('forgeCraft').addEventListener('click',()=>open('recipes'));
  document.getElementById('forgeTonic').addEventListener('click',useTonic);
  mineBtn.addEventListener('click',()=>toggleMine());
  document.getElementById('forgeHudMine').addEventListener('click',()=>toggleMine());
  document.getElementById('forgeHudBag').addEventListener('click',()=>open('bag'));
  document.getElementById('forgePanel').addEventListener('pointerdown',ev=>ev.stopPropagation());

  // Mining: deterministic world generated by integer coordinates. No finite horizontal boundary.
  // Vast repeatable caverns act as mining grind points.
  function grotto(i){
    const r=[18,34,52,74,106,136][((i%6)+6)%6];
    const ores=['copper','iron','gold','crystal','void','void'];
    return {i,col:40+i*58,row:r,ore:ores[((i%6)+6)%6]};
  }
  function nearbyGrotto(x,y){
    const idx=Math.round((x/TS-40)/58);
    for(let i=Math.max(0,idx-1);i<=idx+1;i++){
      const g=grotto(i),gx=g.col*TS,gy=(g.row+3)*TS+8;
      if(Math.abs(x-gx)<46&&Math.abs(y-gy)<43)return {g,x:gx,y:gy};
    }
    return null;
  }
  function hitGrotto(){
    const p=e.player(),node=nearbyGrotto(p.x+p.w/2,p.y+p.h*.6);
    if(!node)return false;
    const g=node.g,cooldown=geodeCooldown.get(mineZone+':'+g.i)||0;
    if(pickTier()<oreDef[g.ore].req){if(e.tick()%70<10)e.notif('Богатая жила требует кирку '+oreDef[g.ore].req);return true}
    if(e.tick()<cooldown){if(e.tick()%90<10)e.notif('Жила восстанавливается');return true}
    if(digCd>0)return true;
    digCd=14;
    const amount=5+Math.floor(hash(g.col,g.row,92)*5)+pickTier();
    add(g.ore,amount,true);add('stone',3,true);
    miningXP+=15;stats.blocks+=amount;minedCount+=amount;
    geodeCooldown.set(mineZone+':'+g.i,e.tick()+1200);
    sparkAt(node.x,node.y,65,oreDef[g.ore].top);
    e.notif('✦ БОГАТАЯ ЖИЛА · '+names[g.ore]+' × '+amount);
    e.sfx(810,.24,'sine',.055);e.save();renderTab();return true;
  }
  function hash(c,r,s=0){
    let h=Math.imul(c,374761393)^Math.imul(r,668265263)^Math.imul(mineZone+1,1442695041)^s;
    h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296;
  }
  function keyOf(c,r){return mineZone+':'+c+':'+r}
  function tileAt(c,r){
    if(r<0||c<0)return null;
    if(r>=MAX_DEPTH)return 'bedrock';
    if(r<8)return null;
    if(c<13&&r<12)return null;
    const near=Math.max(0,Math.floor((c-40+8)/58));
    for(let k=Math.max(0,near-1);k<=near+1;k++){
      const g=grotto(k);
      if(Math.abs(c-g.col)<=8&&Math.abs(r-g.row)<=4)return null;
    }
    const id=keyOf(c,r);if(removed.has(id))return null;
    // Natural cave pockets, connected at different depths.
    const n=Math.sin(c*.16+r*.09)+Math.cos(c*.079-r*.19)*.67+Math.sin(c*.045+r*.23)*.46;
    if(r>10&&n>1.46)return null;
    // Small trapped caverns with regular treasure clusters.
    if(r>14&&((Math.floor(c/37)+Math.floor(r/17)+mineZone*3)%7===1)&&
       Math.abs(c%37-18)<7&&Math.abs(r%17-8)<4)return null;
    const depth=r-8,oreNoise=hash(Math.floor(c/3),Math.floor(r/3),511);
    const fine=hash(c,r,718);
    const cluster=oreNoise*.75+fine*.25;
    if(depth>76&&cluster>.886)return 'void';
    if(depth>46&&cluster>.842)return 'crystal';
    if(depth>36&&cluster>.801)return 'gold';
    if(depth>19&&cluster>.735)return 'iron';
    if(depth>3&&cluster>.687)return 'copper';
    if(cluster>.61)return 'coal';
    if(depth<8&&fine>.49)return 'dirt';
    return 'stone';
  }
  function solidInBox(x,y,w,h){
    const c0=Math.floor(x/TS),c1=Math.floor((x+w-.01)/TS);
    const r0=Math.floor(y/TS),r1=Math.floor((y+h-.01)/TS);
    for(let c=c0;c<=c1;c++)for(let r=r0;r<=r1;r++)if(tileAt(c,r))return true;
    return false;
  }
  function transitionMine(){
    if(inventoryOpen)close();
    if(e.mode()==='menu'||e.mode()==='dead'){e.start();if(e.mode()!=='play')return}
    if(e.mode()!=='play'){e.notif('Сначала продолжи путь');return}
    if(inMine){exitMine();return}
    if(e.bossActive()){e.notif('Нельзя уйти во время битвы со стражем');return}
    surface={x:e.player().x,y:e.player().y,cam:e.camera()};
    mineZone=e.stageId();inMine=true;mineCameraX=0;mineCameraY=0;
    const p=e.player();
    p.x=64;p.y=10*TS-p.h;p.vx=0;p.vy=0;p.ground=true;p.jumps=0;
    mineEnemies=[];tileDamage.clear();mineSparks=[];digCd=0;portalHint.hidden=true;
    e.setCamera(0);e.notif('⛏ ГЛУБОКАЯ ШАХТА · КОПАЙ F / ⛏');
    updateLabels();for(const k in e.keys)e.keys[k]=0;
    e.save();
  }
  function toggleMine(){transitionMine()}
  function exitMine(silent=false){
    if(!inMine)return;
    inMine=false;
    const p=e.player();
    if(surface){p.x=surface.x;p.y=surface.y;e.setCamera(surface.cam)}
    p.vx=0;p.vy=0;p.inv=60;p.ground=true;p.jumps=0;
    mineEnemies=[];tileDamage.clear();mineSparks=[];surface=null;portalHint.hidden=true;
    if(!silent)e.notif('✓ Возвращение на поверхность');
    updateLabels();e.save();
  }
  function beforeReset(freshRun){
    if(inMine){inMine=false;surface=null;mineEnemies=[];tileDamage.clear();shell.classList.remove('in-mine')}
    if(freshRun)fresh();
  }
  function beforeDeath(){
    if(inMine){inMine=false;surface=null;mineEnemies=[];tileDamage.clear();shell.classList.remove('in-mine');updateLabels()}
    close();
  }
  function setHint(s){hintText=s;hintTicks=90;portalHint.textContent=s;portalHint.hidden=false}
  function surfaceTicks(){
    const p=e.player(),st=e.stageId(),dx=Math.abs(p.x-portalX(st));
    if(dx<58){setHint('E · Войти в огромную шахту · F копать')}
    else if(hintTicks>0)hintTicks--;
    else portalHint.hidden=true;
    lastZone=st;
    // Surface mining sites refresh after resting. Mining here is intentionally slow.
    if(e.keys.dig&&tickModulo(17)){
      for(const off of [635,1480,2235]){
        const x=st*e.ZONE+off,k=st+':'+off;
        if(Math.abs(p.x-x)<32){
          const end=surfaceNodeCooldown.get(k)||0;
          if(e.tick()<end){if(e.tick()%95===0)e.notif('Рудная жила восстанавливается');continue}
          const item=off===635?'copper':off===1480?'iron':'coal';
          add(item,off===2235?3:2);
          add('stone',2,true);
          surfaceNodeCooldown.set(k,e.tick()+1500);
          e.particle(x,e.G-20,25,e.biome(st).light,2);
          e.save();
          break;
        }
      }
    }
  }
  function tickModulo(n){return e.tick()%n===0}
  function drawWorld(){
    const st=e.stageId(),b=e.biome(st);
    const start=Math.max(0,st-1);
    for(let z=start;z<=st+1;z++){
      const x=portalX(z)-e.camera();
      if(x> -60 && x<e.W+60){
        // mine lift at the entrance
        e.rect(x-22,e.G-64,44,64,'#171725');
        e.rect(x-19,e.G-60,38,60,b.stone);
        e.rect(x-13,e.G-53,26,53,'#090d1b');
        e.rect(x-17,e.G-65,34,7,b.light+'bc');
        e.rect(x-4,e.G-75,8,11,b.stone);
        for(let q=0;q<3;q++){
          e.rect(x-14+q*13,e.G-49,2,50,b.light+'5a');
          e.rect(x-16,e.G-48+q*14,32,2,b.light+'52');
        }
        e.circle(x,e.G-41,17,b.light+'1d');
        e.rect(x-3,e.G-45,6,10,b.light);
        e.rect(x-1,e.G-44,2,7,'#1a1726');
      }
      for(let j=0;j<3;j++){
        const off=[635,1480,2235][j],xx=z*e.ZONE+off-e.camera();
        if(xx<-40||xx>e.W+40)continue;
        const available=(surfaceNodeCooldown.get(z+':'+off)||0)<e.tick();
        e.rect(xx-13,e.G-15,26,16,'#1a1522');
        e.rect(xx-10,e.G-19,20,7,b.stone);
        e.circle(xx,e.G-22,18,b.light+'18');
        e.rect(xx-5,e.G-27,11,12,available?(j===1?'#aebbd1':'#eab879'):'#41485c');
        e.rect(xx-2,e.G-29,4,3,available?'#f8eed8':'#222838');
        if(available)for(let i=0;i<3;i++)e.rect(xx+Math.sin(e.tick()*.028+i)*14,e.G-35+Math.cos(i+e.tick()*.03)*6,2,2,b.light+'8a');
      }
    }
  }
  function chooseDigTarget(){
    const p=e.player();
    const c=Math.floor((p.x+p.w/2+(e.keys.down?0:p.face*19))/TS);
    const base=e.keys.down?Math.floor((p.y+p.h+4)/TS)
      :e.keys.jump?Math.floor((p.y-4)/TS):Math.floor((p.y+p.h*.48)/TS);
    const candidates=e.keys.down?[[c,base],[c,base+1]]:e.keys.jump?[[c,base],[c+1,base]]:[
      [c,base],[c,Math.floor((p.y+p.h-4)/TS)],[c,Math.floor((p.y+3)/TS)]
    ];
    for(const [x,y] of candidates){const m=tileAt(x,y);if(m)return {c:x,r:y,type:m,id:keyOf(x,y)}}
    return null;
  }
  function strike(){
    if(digCd>0)return;
    if(hitGrotto())return;
    digCd=Math.max(5,13-pickTier()*2);
    const target=chooseDigTarget();
    if(!target){digProgress=0;digTarget='';return}
    const ore=oreDef[target.type];
    if(ore.req>pickTier()){if(e.tick()%34<10)e.notif('Нужна кирка уровня '+ore.req);return}
    let value=(tileDamage.get(target.id)||0)+1;
    const hardness=Math.max(1,Math.ceil(ore.hard/Math.max(1,pickTier()*.83+mineLevel()*.11)));
    digProgress=Math.min(1,value/hardness);digTarget=target.id;
    sparkAt(target.c*TS+8,target.r*TS+8,8,ore.top);
    e.sfx(170+pickTier()*54,.06,'square',.012);
    if(value>=hardness){
      tileDamage.delete(target.id);removed.add(target.id);
      if(removed.size>MAX_REMOVED)removed.delete(removed.values().next().value);
      add(ore.drop,ore.drop==='stone'?1:1,true);
      miningXP+=ore.weight;minedCount++;stats.blocks++;
      if(minedCount%7===0)add(ore.drop,1,true);
      if(minedCount%8===0)e.save();
      if(minedCount%23===0)e.notif('✦ ШАХТЁР УРОВНЯ '+mineLevel());
      digProgress=0;digTarget='';
    }else tileDamage.set(target.id,value);
  }
  function sparkAt(x,y,count,c){
    for(let i=0;i<count;i++){
      const a=hash(i,Math.floor(x+y),e.tick())*Math.PI*2;
      mineSparks.push({x,y,vx:Math.cos(a)*(0.7+hash(i,4)*1.4),
        vy:Math.sin(a)*(0.7+hash(i,5)*1.4),life:14+hash(i,8)*12,c});
    }
    if(mineSparks.length>130)mineSparks.splice(0,mineSparks.length-130);
  }
  function updateMine(){
    const p=e.player();
    if(digCd>0)digCd--;
    const dir=(e.keys.right?1:0)-(e.keys.left?1:0);
    if(dir)p.face=dir;
    if(p.dash>0){p.dash--;p.vx=p.face*5.6}
    else p.vx+=(dir*2.35-p.vx)*.24;
    if(e.pressed.dash&&p.dashCd<=0){p.dash=9;p.dashCd=65;p.inv=Math.max(p.inv,10)}
    if(p.dashCd>0)p.dashCd--;
    if(e.pressed.jump&&p.jumps<2){
      p.vy=p.jumps===0?-6.25:-5.5;p.jumps++;p.ground=false;e.sfx(370,.09);
    }
    p.vy=Math.min(6.7,p.vy+.31);
    if(p.attackCd>0)p.attackCd--;
    if(e.pressed.attack&&p.attackCd<=0){
      p.attack=10;p.attackCd=20;
      e.sfx(430,.07);for(const bat of mineEnemies){
        if(bat.hp>0&&Math.abs(bat.x-p.x)<32&&Math.abs(bat.y-p.y)<32){
          bat.hp-=Math.max(1,Math.ceil(weaponDamage()/3));
          sparkAt(bat.x,bat.y,14,'#d59bec');if(bat.hp<=0){add('essence',2);add('coal',1,true)}
        }
      }
    }
    if(p.attack>0)p.attack--;
    if(e.keys.dig)strike();
    // Stable tile-aligned collision with small substeps.
    let dx=p.vx,dy=p.vy;
    let steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/3));
    let movedX=false,movedY=false;
    for(let i=0;i<steps;i++){
      let xx=Math.max(0,p.x+dx/steps);
      if(!solidInBox(xx,p.y,p.w,p.h)){p.x=xx;movedX=true}
      else p.vx=0;
      let yy=p.y+dy/steps;
      if(!solidInBox(p.x,yy,p.w,p.h)){p.y=yy;movedY=true;p.ground=false}
      else{
        if(dy>0){p.ground=true;p.jumps=0}
        p.vy=0;
      }
    }
    if(p.ground&&Math.abs(p.vy)<.1){p.jumps=0}
    p.y=Math.max(0,Math.min((MAX_DEPTH-3)*TS,p.y));
    p.anim=(p.anim||0)+Math.abs(p.vx)*.14;
    if(p.inv>0)p.inv--;
    // Rare underground spirits emerge in existing caverns after sufficient depth.
    if(e.tick()-mineMobSpawnTick>220&&p.y/TS>20){
      mineMobSpawnTick=e.tick();
      if(mineEnemies.filter(m=>m.hp>0).length<5){
        const side=hash(Math.floor(p.x/TS),Math.floor(p.y/TS),e.tick())>.5?1:-1;
        const x=p.x+side*(100+hash(e.tick(),7)*80),y=p.y-15;
        if(!solidInBox(x,y,14,14))mineEnemies.push({x,y,home:x,t:0,hp:4+Math.floor(p.y/TS/32)});
      }
    }
    for(const bat of mineEnemies){
      if(bat.hp<=0)continue;
      bat.t++;
      bat.x+=(p.x>bat.x?.47:-.47);
      bat.y+=Math.sin(bat.t*.08)*.54+(p.y>bat.y?.22:-.22);
      if(Math.abs(p.x-bat.x)<15&&Math.abs(p.y-bat.y)<19){
        const amount=1+Math.floor(Math.max(0,p.y/TS-25)/39);
        e.damage(amount,bat.x);
      }
    }
    if(mineEnemies.length>22)mineEnemies=mineEnemies.filter(b=>b.hp>0&&Math.abs(b.x-p.x)<450);
    for(let i=mineSparks.length-1;i>=0;i--){
      const q=mineSparks[i];q.x+=q.vx;q.y+=q.vy;q.vy+=.08;q.life--;
      if(q.life<1)mineSparks.splice(i,1);
    }
    mineCameraX+=(Math.max(0,p.x-185)-mineCameraX)*.13;
    mineCameraY+=(Math.max(0,p.y-110)-mineCameraY)*.09;
    e.setCamera(mineCameraX); // reuse the hero renderer.
    mineHint.textContent='⛏ ГЛУБИНА '+Math.max(0,Math.floor(p.y/TS)-9)+
      ' / 163 · КИРКА '+pickTier()+' · F копать · S ↓ · E выход';
    if(e.tick()%720===0)e.save();
  }
  function drawMine(){
    const ctx=e.ctx,W=e.W,H=e.H,b=e.biome(mineZone),p=e.player();
    // layered underground fog and volcanic colour grading, shifting with depth
    const depth=Math.max(0,p.y/TS-8);
    const background=ctx.createLinearGradient(0,0,0,H);
    background.addColorStop(0,depth<45?'#101525':depth<90?'#161327':'#190e23');
    background.addColorStop(1,depth<45?'#060916':depth<90?'#08070f':'#0b0712');
    ctx.fillStyle=background;ctx.fillRect(0,0,W,H);
    const c0=Math.floor(mineCameraX/TS)-1,r0=Math.max(0,Math.floor(mineCameraY/TS)-1);
    const c1=c0+Math.ceil(W/TS)+3,r1=Math.min(MAX_DEPTH,r0+Math.ceil(H/TS)+3);
    for(let c=Math.max(0,c0);c<=c1;c++)for(let r=r0;r<=r1;r++){
      const x=Math.floor(c*TS-mineCameraX),y=Math.floor(r*TS-mineCameraY),type=tileAt(c,r);
      const n=hash(c,r,377);
      if(!type){
        if(n>.9){ctx.fillStyle='#ffffff0d';ctx.fillRect(x+3,y+5,2,2)}
        if(r>15&&r%12===0&&n>.8){ctx.fillStyle=b.light+'2d';ctx.fillRect(x+5,y+1,1,7)}
        continue;
      }
      const d=oreDef[type];
      ctx.fillStyle=d.color;ctx.fillRect(x,y,16,16);
      ctx.fillStyle=d.top;ctx.fillRect(x+1,y+1,14,2);
      ctx.fillStyle='#090a17a0';ctx.fillRect(x+14,y+2,2,14);
      ctx.fillStyle='#dcd6e012';ctx.fillRect(x+4,y+6,6,1);
      if(type!=='stone'&&type!=='dirt'&&type!=='bedrock'){
        ctx.fillStyle=d.top;
        const qx=3+Math.floor(n*8),qy=4+Math.floor(hash(c,r,8)*7);
        ctx.fillRect(x+qx,y+qy,4,3);ctx.fillRect(x+qx-2,y+qy+4,2,3);
        ctx.fillStyle='#ffffff7c';ctx.fillRect(x+qx,y+qy,2,1);
        if(type==='crystal'||type==='void'||type==='gold'){
          ctx.fillStyle=d.top+'40';ctx.fillRect(x-2,y-2,20,20);
        }
      }
      if(r%16===0&&c%43===10){
        ctx.fillStyle=b.light+'8a';ctx.fillRect(x+6,y+2,3,3);
      }
    }
    // Massive mining grottoes glow through the rock. Every node respawns, making them repeatable farming sites.
    const grottoStart=Math.max(0,Math.floor((c0-40)/58)-1);
    const grottoEnd=Math.max(grottoStart,Math.ceil((c1-40)/58)+1);
    for(let j=grottoStart;j<=grottoEnd;j++){
      const g=grotto(j),xx=g.col*TS-mineCameraX,yy=(g.row+3)*TS+8-mineCameraY;
      if(yy<-75||yy>H+75||xx<-75||xx>W+75)continue;
      const ore=oreDef[g.ore],active=e.tick()>=(geodeCooldown.get(mineZone+':'+g.i)||0);
      const glow=ctx.createRadialGradient(xx,yy,4,xx,yy,76);
      glow.addColorStop(0,ore.top+(active?'55':'17'));glow.addColorStop(1,ore.top+'00');
      ctx.fillStyle=glow;ctx.fillRect(xx-76,yy-76,152,152);
      // abandoned rails, supports and a glimmering crystal deposit
      ctx.fillStyle='#625d71';ctx.fillRect(xx-48,yy+15,96,4);ctx.fillRect(xx-48,yy+21,96,2);
      ctx.fillStyle='#8e7f72';ctx.fillRect(xx-52,yy-47,5,66);ctx.fillRect(xx+47,yy-47,5,66);
      ctx.fillRect(xx-52,yy-47,104,5);
      if(active){
        ctx.fillStyle=ore.top;
        for(let q=0;q<7;q++){
          const a=q*Math.PI*2/7+e.tick()*.004,px=xx+Math.cos(a)*19,py=yy+Math.sin(a)*14;
          ctx.beginPath();ctx.moveTo(px,py-13);ctx.lineTo(px+7,py+5);ctx.lineTo(px-7,py+5);ctx.closePath();ctx.fill();
        }
        ctx.fillStyle='#ffffffd2';ctx.fillRect(xx-2,yy-5,5,5);
        ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillStyle=ore.top;
        ctx.fillText('БОГАТАЯ ЖИЛА',xx,yy-33);ctx.textAlign='left';
      }else{
        ctx.fillStyle='#39364a';ctx.fillRect(xx-13,yy-8,27,16);
        ctx.fillStyle=ore.top+'66';ctx.fillRect(xx-5,yy-4,9,6);
      }
    }
    // Huge glowing chambers at regular depth intervals.
    for(let i=0;i<9;i++){
      const c=28+i*49,y=18+(i%4)*24;
      const xx=c*TS-mineCameraX,yy=y*TS-mineCameraY;
      if(xx<-70||xx>W+70||yy<-70||yy>H+70)continue;
      const radial=ctx.createRadialGradient(xx,yy,2,xx,yy,52);
      radial.addColorStop(0,b.light+'32');radial.addColorStop(1,b.light+'00');
      ctx.fillStyle=radial;ctx.fillRect(xx-52,yy-52,104,104);
      ctx.fillStyle=b.light+'66';ctx.fillRect(xx-2,yy-5,4,9);
    }
    // Lantern-lit miner's entrance with lift and carved columns.
    const sx=64-mineCameraX,sy=10*TS-mineCameraY;
    if(sx>-80&&sx<W+80&&sy>-120&&sy<H+30){
      ctx.fillStyle='#9a8161';ctx.fillRect(sx-36,sy-82,6,82);ctx.fillRect(sx+30,sy-82,6,82);
      ctx.fillRect(sx-36,sy-82,72,7);ctx.fillRect(sx-42,sy-90,84,9);
      ctx.fillStyle=b.light+'b0';ctx.fillRect(sx-4,sy-89,8,8);
      ctx.fillStyle='#0e0f1a';ctx.fillRect(sx-29,sy-72,58,72);
      ctx.font='bold 8px monospace';ctx.fillStyle='#e9d1a7';ctx.textAlign='center';
      ctx.fillText('ШАХТА',sx,sy-94);ctx.textAlign='left';
    }
    for(const bat of mineEnemies){
      if(bat.hp<=0)continue;
      const x=bat.x-mineCameraX,y=bat.y-mineCameraY;
      ctx.fillStyle='#8e77ba';ctx.fillRect(x-11,y+3,23,5);
      ctx.fillStyle='#171321';ctx.fillRect(x-5,y,11,13);
      ctx.fillStyle='#d0a5ff';ctx.fillRect(x-3,y+3,2,2);ctx.fillRect(x+3,y+3,2,2);
      for(let j=0;j<2;j++){ctx.fillStyle='#c1a1e05c';ctx.fillRect(x+(j?12:-12),y+Math.sin(e.tick()*.19+j)*4,7,2)}
    }
    ctx.save();
    ctx.translate(0,-mineCameraY);
    e.drawPlayer();
    ctx.restore();
    for(const q of mineSparks){
      ctx.globalAlpha=Math.min(1,q.life/12);
      ctx.fillStyle=q.c;ctx.fillRect(q.x-mineCameraX,q.y-mineCameraY,2,2);
    }ctx.globalAlpha=1;
    // Mining reticle and progress.
    const target=chooseDigTarget();
    if(target){
      const x=target.c*TS-mineCameraX,y=target.r*TS-mineCameraY;
      ctx.strokeStyle=target.id===digTarget?'#f7db99':'#ffffff6a';ctx.lineWidth=1;
      ctx.strokeRect(Math.round(x)+.5,Math.round(y)+.5,15,15);
      if(target.id===digTarget){
        ctx.fillStyle='#0a0b1e';ctx.fillRect(x-4,y-7,24,4);
        ctx.fillStyle='#f7db99';ctx.fillRect(x-4,y-7,24*digProgress,4);
      }
    }
    // Dark glass HUD separate from overworld; avoids overwriting mine visuals.
    ctx.fillStyle='#070913bc';ctx.fillRect(7,8,200,32);
    ctx.fillStyle='#f8e2b4';ctx.font='bold 9px monospace';ctx.textBaseline='top';
    ctx.fillText('⛏  ГЛУБИНА: '+Math.max(0,Math.floor(p.y/TS)-9),14,14);
    ctx.fillText('⚒  КИРКА: '+pickTier()+'  ·  БЛОКОВ: '+stats.blocks,14,27);
    const grotto=nearbyGrotto(p.x+p.w/2,p.y+p.h*.6);
    if(grotto){ctx.fillStyle='#141321bd';ctx.fillRect(126,44,230,20);ctx.fillStyle='#ffe9b7';ctx.fillText('✦ ЖИЛА: '+names[grotto.g.ore]+' · F / ⛏',132,50)}
    ctx.fillStyle='#0c0c19b5';ctx.fillRect(105,H-30,270,23);
    ctx.fillStyle='#e8c998';ctx.font='bold 9px monospace';
    ctx.textAlign='center';ctx.fillText('F / ⛏  КОПАТЬ       S / ▼  ВНИЗ       E  ВЫХОД',240,H-22);
    ctx.textAlign='left';
  }
  function surfaceResourceDrops(enemyType,stage){
    stats.mobs++;
    add('essence',1+Math.floor(stage/3),true);
    if(enemyType===0||enemyType===2)add('wood',1,true);
    if(stage>=2&&stats.mobs%4===0)add('coal',2,true);
    if(stats.mobs%5===0)e.notif('✦ С добычей! Эссенция и древесина');
    if(stats.mobs%5===0)e.save();
  }
  function bossDrops(stage){
    stats.bosses++;
    add('essence',9+stage*3,true);
    add('gold',2+Math.floor(stage/2),true);
    if(stage>=3)add('crystal',Math.min(8,2+Math.floor(stage/3)),true);
    if(stage>=7)add('void',1+Math.floor((stage-7)/3),true);
    e.notif('⚒ ПОБЕДА · редкие материалы получены');e.save();
  }
  function eliteDrops(stage){
    add('essence',4+stage,true);
    add('copper',2,true);
    if(stage>=1)add('iron',1+Math.floor(stage/2),true);
    if(stage>=4)add('crystal',2,true);
    e.save();
  }
  function onHotkey(code){
    if(code==='KeyI'||code==='Tab'){toggle();return true}
    if(code==='KeyE'){transitionMine();return true}
    if(code==='KeyR'){useTonic();return true}
    if(inventoryOpen&&(code==='Escape'||code==='KeyP')){close();return true}
    return false;
  }
  function onReset(freshRun){beforeReset(freshRun);if(!freshRun){const p=e.player();if(p)p.max=6+Math.floor(armorValue()*.75)}}
  fresh();
  return {
    get inMine(){return inMine},
    get inventoryOpen(){return inventoryOpen},
    snapshot,restore,fresh,onReset,beforeDeath,updateMine,drawMine,surfaceTicks,drawWorld,
    onHotkey,toggleMine,open,close,craft,equip,useTonic,add,weaponDamage,armorValue,pickTier,
    effectiveBossDamage,surfaceResourceDrops,bossDrops,eliteDrops,
    debug:()=>({bag:{...bag},gear:{...gear},blocks:stats.blocks,miningXP,mineLevel:mineLevel(),
      inMine,inventoryOpen,removed:removed.size,zone:mineZone}),
    debugTile:(c,r)=>tileAt(c,r)
  };
};
})();