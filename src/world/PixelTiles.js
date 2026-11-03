import { TileId } from './generateWorld.js';
const palette=['#315b37','#a67937','#7896a7','#47766b','#8b4245','#665647','#416a67','#345a72','#5b426f','#358776','#6b6d83','#593d59'];
const soils=['#513a30','#6e4b2c','#56616b','#345348','#633538','#4d3c36','#344c49','#314653','#463753','#285b50','#444854','#473243'];
const rocks=['#39414a','#635441','#4b5a69','#334b48','#58363a','#4b4543','#344a4c','#344958','#44384f','#31564e','#464d5a','#49364b'];
export function createPixelChunk(scene,manager,chunk,biomeIndex){
 const scale=16,key=`chunk-${chunk.x}-${chunk.y}`,texture=scene.textures.createCanvas(key,chunk.width*scale,chunk.height*scale),ctx=texture.getContext();
 const accent=palette[biomeIndex%palette.length],soil=soils[biomeIndex%soils.length],rock=rocks[biomeIndex%rocks.length];
 for(let y=0;y<chunk.height;y++)for(let x=0;x<chunk.width;x++){
  const id=manager.getTile(chunk.startX+x,chunk.startY+y);if(id===TileId.AIR)continue;const px=x*scale,py=y*scale;
  ctx.fillStyle=id===TileId.GRASS?accent:id===TileId.SOIL?soil:id===TileId.STONE?rock:id===TileId.ORE?'#c28a55':id===TileId.CRYSTAL?'#54b9c3':id===TileId.WATER?'#3977a3':'#8d6337';ctx.fillRect(px,py,scale,scale);
  if(id===TileId.GRASS){ctx.fillStyle='#91b86a';ctx.fillRect(px,py,scale,3);ctx.fillStyle='rgba(15,27,22,.3)';ctx.fillRect(px,py+scale-2,scale,2);}
  else{ctx.fillStyle='rgba(255,255,255,.08)';const n=(chunk.startX+x*13+chunk.startY+y*7)%11;if(n<4)ctx.fillRect(px+(n*3)%13,py+(n*5)%13,2,2);ctx.fillStyle='rgba(5,9,14,.18)';ctx.fillRect(px,py+14,16,2);}
  if(id===TileId.ORE||id===TileId.CRYSTAL){ctx.fillStyle=id===TileId.ORE?'#f1c47a':'#b8fff1';ctx.fillRect(px+5,py+4,5,7);ctx.fillRect(px+9,py+8,3,3);}
 }
 texture.refresh();return scene.add.image(chunk.startX*scale,chunk.startY*scale,key).setOrigin(0).setDepth(1);
}
