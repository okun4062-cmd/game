const names=['Лесной идол','Песчаная вдова','Ледяной исполин','Королева кристаллов','Утопленник бездны','Чёрное крыло','Хрономант','Оракул корней','Грозовой змей','Костяной паладин','Король затмения','Пожиратель миров'];
const colors=[0x92db78,0xe9a65e,0x92d7f2,0x70f2df,0x6ba8cb,0xc68cec,0xe7c77e,0x8bd58a,0x93b7ef,0xd5c1a1,0xe786d3,0x9e9afe];
export const GUARDIANS=names.map((name,i)=>({id:`guardian-${i+1}`,name,color:colors[i],maxHp:240+i*35,damage:12+i,speed:45+i*2,pattern:i%4}));
export const BossSystem={
 spawn(scene,definition,x,y){const d=typeof definition==='string'?GUARDIANS.find(b=>b.id===definition):definition;if(!d)return null;
  const index=Number(d.id.split('-')[1])||1,body=scene.physics.add.sprite(x,y,d.texture||`guardian-${index}`);
  body.setTint(d.color);body.setScale(2.6);body.setBounce(.15);body.setCollideWorldBounds(true);body.hp=d.maxHp;body.maxHp=d.maxHp;body.guardian=d;body.isBoss=true;body.attackClock=0;body.setDepth(7);
  body.update=(player,delta=16)=>{if(!body.active||body.hp<=0)return;body.attackClock+=delta;const dx=player.x-body.x,dy=player.y-body.y,length=Math.hypot(dx,dy)||1;body.setVelocity(dx/length*d.speed,Math.max(-80,dy/length*d.speed*.7));if(body.attackClock>=1250){body.attackClock=0;if(Math.abs(dx)<34&&Math.abs(dy)<32)player.takeDamage?.(d.damage);else if(scene.spawnEnemyProjectile)scene.spawnEnemyProjectile(body.x,body.y,player.x,player.y,d.damage);}};
  body.destroyGuardian=()=>body.destroy();return body;
 }
};

