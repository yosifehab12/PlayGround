import * as THREE from 'three';

/* ================= Minecraft 3D — phone/tablet + desktop ================= */
const $ = id => document.getElementById(id);
const toast = (m, t=1800) => { const e=$('toast'); e.textContent=m; e.style.display='block'; clearTimeout(e._t); e._t=setTimeout(()=>e.style.display='none',t); };
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add('touch');

/* ---------- blocks ---------- */
const B = { AIR:0, GRASS:1, DIRT:2, STONE:3, LOG:4, LEAVES:5, SAND:6, PLANKS:7, GLASS:8, BRICK:9, WATER:10, BEDROCK:11, SNOW:12, COBBLE:13 };
const BLOCKS = {
  1:{name:'Grass', icon:'🟩'}, 2:{name:'Dirt', icon:'🟫'}, 3:{name:'Stone', icon:'🪨'},
  4:{name:'Wood', icon:'🪵'}, 5:{name:'Leaves', icon:'🍃'}, 6:{name:'Sand', icon:'🏖️'},
  7:{name:'Planks', icon:'🟧'}, 8:{name:'Glass', icon:'🪟'}, 9:{name:'Brick', icon:'🧱'},
  10:{name:'Water', icon:'💧'}, 11:{name:'Bedrock', icon:'⬛'}, 12:{name:'Snow', icon:'⬜'}, 13:{name:'Cobble', icon:'🔘'},
};
const HOTBAR = [1,2,3,4,5,6,7,8,9];
let selIndex = 0;

// atlas tile indices
const T = { grassTop:0, grassSide:1, dirt:2, stone:3, logSide:4, logTop:5, leaves:6, sand:7, planks:8, glass:9, brick:10, water:11, bedrock:12, snow:13, snowSide:14, cobble:15 };
function tileFor(block, face){ // face: 0 +x,1 -x,2 +y,3 -y,4 +z,5 -z
  switch(block){
    case B.GRASS: return face===2?T.grassTop:(face===3?T.dirt:T.grassSide);
    case B.DIRT: return T.dirt; case B.STONE: return T.stone;
    case B.LOG: return (face===2||face===3)?T.logTop:T.logSide;
    case B.LEAVES: return T.leaves; case B.SAND: return T.sand;
    case B.PLANKS: return T.planks; case B.GLASS: return T.glass;
    case B.BRICK: return T.brick; case B.WATER: return T.water;
    case B.BEDROCK: return T.bedrock; case B.SNOW: return face===2?T.snow:(face===3?T.dirt:T.snowSide);
    case B.COBBLE: return T.cobble; default: return T.stone;
  }
}
const TRANSPARENT = new Set([B.AIR, B.LEAVES, B.GLASS, B.WATER]);

/* ---------- procedural texture atlas ---------- */
function makeAtlas(){
  const S=256, N=16, TZ=S/N; // 16x16 tiles
  const c=document.createElement('canvas'); c.width=c.height=S;
  const g=c.getContext('2d');
  const rnd=(s=>()=> (s=(s*16807)%2147483647)/2147483647)(1234);
  function noiseFill(tx,ty,base,varc,fn){
    const x0=tx*TZ, y0=ty*TZ;
    g.fillStyle=base; g.fillRect(x0,y0,TZ,TZ);
    for(let y=0;y<TZ;y++)for(let x=0;x<TZ;x++){
      if(fn && !fn(x,y)) continue;
      const v=(Math.random()-0.5)*varc;
      g.fillStyle=`rgba(${v>0?255:0},${v>0?255:0},${v>0?255:0},${Math.abs(v)})`;
      g.fillRect(x0+x,y0+y,1,1);
    }
  }
  const px=(tx,ty)=>[ (tx%4)*4+Math.floor(tx/4)*0, 0 ]; // placeholder
  function tilePos(i){ return [(i%16)*TZ, Math.floor(i/16)*TZ]; }
  // 0 grass top
  { const [x,y]=tilePos(T.grassTop); g.fillStyle='#5fae3f'; g.fillRect(x,y,TZ,TZ); noiseFill2(x,y,'#5fae3f','#3e8a27'); }
  function noiseFill2(x0,y0,b1,b2){ for(let i=0;i<160;i++){ g.fillStyle=Math.random()<.5?b1:b2; g.fillRect(x0+Math.random()*TZ|0, y0+Math.random()*TZ|0,2,2);} }
  // 1 grass side
  { const [x,y]=tilePos(T.grassSide); g.fillStyle='#7a5230'; g.fillRect(x,y,TZ,TZ); noiseFill2(x,y,'#7a5230','#5e3d22'); g.fillStyle='#5fae3f'; g.fillRect(x,y,TZ,4); g.fillStyle='#3e8a27'; for(let i=0;i<TZ;i+=2) g.fillRect(x+i,y+4+Math.random()*3|0,1,2); }
  // 2 dirt
  { const [x,y]=tilePos(T.dirt); g.fillStyle='#7a5230'; g.fillRect(x,y,TZ,TZ); noiseFill2(x,y,'#7a5230','#4e3319'); }
  // 3 stone
  { const [x,y]=tilePos(T.stone); g.fillStyle='#8a8a8a'; g.fillRect(x,y,TZ,TZ); noiseFill2(x,y,'#8a8a8a','#6e6e6e'); }
  // 4 log side
  { const [x,y]=tilePos(T.logSide); g.fillStyle='#5b4128'; g.fillRect(x,y,TZ,TZ); g.fillStyle='#3d2c1a'; for(let i=2;i<TZ;i+=4) g.fillRect(x+i,y,1,TZ); noiseFill2(x,y,'#5b4128','#6e5335'); }
  // 5 log top
  { const [x,y]=tilePos(T.logTop); g.fillStyle='#a0824f'; g.fillRect(x,y,TZ,TZ); g.strokeStyle='#5b4128'; for(let r=7;r>0;r-=2){g.beginPath();g.arc(x+8,y+8,r,0,7);g.stroke();} }
  // 6 leaves (with holes)
  { const [x,y]=tilePos(T.leaves); g.fillStyle='#2f7a24'; g.fillRect(x,y,TZ,TZ); noiseFill2(x,y,'#2f7a24','#1e5a16'); g.fillStyle='#123a0d'; for(let i=0;i<24;i++) g.fillRect(x+Math.random()*TZ|0,y+Math.random()*TZ|0,2,2); }
  // 7 sand
  { const [x,y]=tilePos(T.sand); g.fillStyle='#e0d29a'; g.fillRect(x,y,TZ,TZ); noiseFill2(x,y,'#e0d29a','#c4b57e'); }
  // 8 planks
  { const [x,y]=tilePos(T.planks); g.fillStyle='#b08a4f'; g.fillRect(x,y,TZ,TZ); g.fillStyle='#7d5f31'; for(let i=0;i<TZ;i+=4) g.fillRect(x,y+i,TZ,1); noiseFill2(x,y,'#b08a4f','#96733f'); }
  // 9 glass
  { const [x,y]=tilePos(T.glass); g.fillStyle='rgba(200,230,255,0.35)'; g.fillRect(x,y,TZ,TZ); g.strokeStyle='#e8f6ff'; g.lineWidth=2; g.strokeRect(x+1,y+1,TZ-2,TZ-2); g.strokeStyle='rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(x+3,y+12); g.lineTo(x+10,y+4); g.stroke(); }
  // 10 brick
  { const [x,y]=tilePos(T.brick); g.fillStyle='#9e3d31'; g.fillRect(x,y,TZ,TZ); g.fillStyle='#c9c9c9'; g.fillRect(x,y,TZ,1); for(let r=0;r<4;r++){g.fillRect(x,y+r*4,TZ,1); for(let cx=(r%2?4:0);cx<TZ;cx+=8) g.fillRect(x+cx,y+r*4,1,4);} }
  // 11 water
  { const [x,y]=tilePos(T.water); g.fillStyle='#2f6fd6'; g.fillRect(x,y,TZ,TZ); noiseFill2(x,y,'#2f6fd6','#4a90ff'); }
  // 12 bedrock
  { const [x,y]=tilePos(T.bedrock); g.fillStyle='#2b2b2b'; g.fillRect(x,y,TZ,TZ); noiseFill2(x,y,'#2b2b2b','#555'); }
  // 13 snow
  { const [x,y]=tilePos(T.snow); g.fillStyle='#f2f7fb'; g.fillRect(x,y,TZ,TZ); noiseFill2(x,y,'#f2f7fb','#cdd9e5'); }
  // 14 snow side
  { const [x,y]=tilePos(T.snowSide); g.fillStyle='#7a5230'; g.fillRect(x,y,TZ,TZ); g.fillStyle='#f2f7fb'; g.fillRect(x,y,TZ,5); }
  // 15 cobble
  { const [x,y]=tilePos(T.cobble); g.fillStyle='#777'; g.fillRect(x,y,TZ,TZ); g.strokeStyle='#444'; for(let i=0;i<5;i++){const rx=Math.random()*10,ry=Math.random()*10;g.strokeRect(x+rx,y+ry,5,4);} }
  const tex=new THREE.CanvasTexture(c);
  tex.magFilter=THREE.NearestFilter; tex.minFilter=THREE.NearestFilter; tex.colorSpace=THREE.SRGBColorSpace;
  tex.generateMipmaps=false;
  return tex;
}

/* ---------- world data ---------- */
const SX=64, SY=40, SZ=64, WATER_Y=11;
const world = new Uint8Array(SX*SY*SZ);
const inW=(x,y,z)=> x>=0&&x<SX&&y>=0&&y<SY&&z>=0&&z<SZ;
function getB(x,y,z){ if(y<0) return B.BEDROCK; if(!inW(x,y,z)) return B.AIR; return world[(y*SZ+z)*SX+x]; }
function setB(x,y,z,v){ if(!inW(x,y,z)) return; world[(y*SZ+z)*SX+x]=v; }

// deterministic noise
function hash2(x,z,seed){ let h = x*374761393 + z*668265263 + seed*1442695041; h=(h^(h>>13))*1274126177; return ((h^(h>>16))>>>0)/4294967295; }
function smooth(t){ return t*t*(3-2*t); }
function valueNoise(x,z,seed){
  const xi=Math.floor(x), zi=Math.floor(z), xf=x-xi, zf=z-zi;
  const a=hash2(xi,zi,seed), b=hash2(xi+1,zi,seed), c=hash2(xi,zi+1,seed), d=hash2(xi+1,zi+1,seed);
  const u=smooth(xf), v=smooth(zf);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
function fbm(x,z,seed){ return valueNoise(x,z,seed)*0.55 + valueNoise(x*2.3,z*2.3,seed+7)*0.3 + valueNoise(x*5.1,z*5.1,seed+13)*0.15; }

let SEED = 1337;
function genWorld(seed){
  SEED=seed; world.fill(0);
  for(let x=0;x<SX;x++) for(let z=0;z<SZ;z++){
    const n=fbm(x*0.06,z*0.06,seed);
    const m=fbm(x*0.15+100,z*0.15+100,seed+99);
    let h = Math.floor(9 + n*14 + (m-0.5)*4);
    h=Math.max(2,Math.min(SY-12,h));
    const beach = h<=WATER_Y+1;
    for(let y=0;y<=h;y++){
      let b=B.DIRT;
      if(y===0) b=B.BEDROCK;
      else if(y===h) b = h>=24?B.SNOW:(beach?B.SAND:B.GRASS);
      else if(y>h-3) b = beach?B.SAND:B.DIRT;
      else b = (hash2(x,y*7+z,seed)<0.12)?B.COBBLE:B.STONE;
      setB(x,y,z,b);
    }
    if(h<WATER_Y) for(let y=h+1;y<=WATER_Y;y++) setB(x,y,z,B.WATER);
  }
  // trees
  let rndS=seed;
  const srand=()=> (rndS=(rndS*16807)%2147483647)/2147483647;
  for(let i=0;i<220;i++){
    const x=3+Math.floor(srand()*(SX-6)), z=3+Math.floor(srand()*(SZ-6));
    let top=-1; for(let y=SY-1;y>0;y--){ if(getB(x,y,z)!==B.AIR&&getB(x,y,z)!==B.WATER){top=y;break;} }
    if(top<0) continue;
    if(getB(x,top,z)!==B.GRASS) continue;
    if(srand()<0.55) continue;
    const th=3+Math.floor(srand()*2);
    if(top+th+2>=SY) continue;
    for(let dy=0;dy<th;dy++) setB(x,top+1+dy,z,B.LOG);
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=0;dy<3;dy++){
      if(Math.abs(dx)===2&&Math.abs(dz)===2&&dy>0) continue;
      if(dx===0&&dz===0&&dy<2) continue;
      const px=x+dx,py=top+th-1+dy,pz=z+dz;
      if(inW(px,py,pz)&&getB(px,py,pz)===B.AIR) setB(px,py,pz,B.LEAVES);
    }
    setB(x,top+th+1,z,B.LEAVES);
  }
}

/* ---------- three setup ---------- */
const root=$('game-root');
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1, isTouch?1.8:2));
renderer.setSize(innerWidth,innerHeight);
root.appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);
scene.fog=new THREE.Fog(0x87ceeb, 30, 95);
const camera=new THREE.PerspectiveCamera(isTouch?78:72, innerWidth/innerHeight, 0.1, 300);
const hemi=new THREE.HemisphereLight(0xcfe8ff,0x6b5b43,0.95); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,1.5); sun.position.set(40,60,20); scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff,0.15));

const atlasTex=makeAtlas();
const matOpaque=new THREE.MeshLambertMaterial({map:atlasTex, side:THREE.DoubleSide, vertexColors:true});
const matTrans=new THREE.MeshLambertMaterial({map:atlasTex, transparent:true, opacity:0.92, alphaTest:0.12, side:THREE.DoubleSide, vertexColors:true});

const CH=16;
const chunkMeshes=new Map();
function uvFor(tile){
  const tx=tile%16, ty=Math.floor(tile/16);
  const s=1/16, pad=0.5/256;
  // canvas y down vs uv y up: flip
  const u0=tx*s+pad, u1=(tx+1)*s-pad, v1=1-ty*s-pad, v0=1-(ty+1)*s+pad;
  return [u0,v0,u1,v1];
}
const FACES=[
  {d:[1,0,0], c:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]], n:[1,0,0], s:1.0},   // +x (shade .78)
  {d:[-1,0,0],c:[[-0,0,0],[-0,0,1],[-0,1,1],[-0,1,0]], n:[-1,0,0], s:0.78},
  {d:[0,1,0], c:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]], n:[0,1,0], s:1.0},
  {d:[0,-1,0],c:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]], n:[0,-1,0], s:0.62},
  {d:[0,0,1], c:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]], n:[0,0,1], s:0.86},
  {d:[0,0,-1],c:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]], n:[0,0,-1], s:0.86},
];
// face index mapping for tileFor: 0 +x,1 -x,2 +y,3 -y,4 +z,5 -z
function buildChunk2(cx,cz){
  const key=cx+','+cz;
  const old=chunkMeshes.get(key);
  if(old){ old.forEach(m=>{scene.remove(m); m.geometry.dispose();}); chunkMeshes.delete(key);}
  const posO=[],nrmO=[],uvO=[],colO=[],iO=[];
  const posT=[],nrmT=[],uvT=[],colT=[],iT=[];
  const x0=cx*CH, z0=cz*CH;
  for(let x=x0;x<x0+CH;x++)for(let z=z0;z<z0+CH;z++)for(let y=0;y<SY;y++){
    const b=getB(x,y,z); if(!b) continue;
    const isT=(b===B.LEAVES||b===B.GLASS||b===B.WATER);
    for(let f=0;f<6;f++){
      const F=FACES[f];
      const nb=getB(x+F.d[0],y+F.d[1],z+F.d[2]);
      let show=false;
      if(nb===B.AIR) show=true;
      else if(TRANSPARENT.has(nb)&&nb!==b) show=true;
      if(!show) continue;
      if(b===B.WATER && f===3) continue; // skip water bottom
      const tile=tileFor(b,f);
      const [u0,v0,u1,v1]=uvFor(tile);
      const qu=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
      const P=isT?posT:posO, N=isT?nrmT:nrmO, U=isT?uvT:uvO, C=isT?colT:colO, I=isT?iT:iO;
      const base=P.length/3;
      const shade=b===B.WATER?1:[0.78,0.78,1.0,0.6,0.88,0.88][f];
      const topLower=(b===B.WATER)?0.12:0;
      for(let i=0;i<4;i++){
        const c=F.c[i];
        let vy=y+c[1]; if(b===B.WATER&&c[1]===1) vy-=topLower;
        P.push(x+c[0],vy,z+c[2]); N.push(...F.n); U.push(qu[i][0],qu[i][1]); C.push(shade,shade,shade);
      }
      I.push(base,base+1,base+2, base,base+2,base+3);
    }
  }
  const made=[];
  function mk(P,N,U,C,I,mat){ if(!I.length) return null;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));
    g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
    g.setIndex(I); const m=new THREE.Mesh(g,mat); m.matrixAutoUpdate=false; scene.add(m); return m; }
  const a=mk(posO,nrmO,uvO,colO,iO,matOpaque);
  const t=mk(posT,nrmT,uvT,colT,iT,matTrans);
  if(a) made.push(a); if(t) made.push(t);
  chunkMeshes.set(key,made);
}
function buildAll(){ for(let cx=0;cx<SX/CH;cx++)for(let cz=0;cz<SZ/CH;cz++) buildChunk2(cx,cz); }
function rebuildAt(x,z){ buildChunk2(Math.floor(x/CH),Math.floor(z/CH));
  // neighbor chunks if on border
  const lx=x%CH, lz=z%CH;
  if(lx===0) buildChunk2(Math.floor((x-1)/CH),Math.floor(z/CH));
  if(lx===15) buildChunk2(Math.floor((x+1)/CH),Math.floor(z/CH));
  if(lz===0) buildChunk2(Math.floor(x/CH),Math.floor((z-1)/CH));
  if(lz===15) buildChunk2(Math.floor(x/CH),Math.floor((z+1)/CH));
}

/* ---------- player ---------- */
const player={ pos:new THREE.Vector3(SX/2+0.5,20,SZ/2+0.5), vel:new THREE.Vector3(), yaw:Math.PI*0.25, pitch:-0.15, onGround:false, fly:false, w:0.32, h:1.8, eye:1.62 };
function spawnTop(){
  // prefer a grass spot near center for a nice first view
  let sx=SX/2, sz=SZ/2;
  outer:
  for(let r=0;r<24;r++) for(let dx=-r;dx<=r;dx++) for(let dz=-r;dz<=r;dz++){
    if(Math.max(Math.abs(dx),Math.abs(dz))!==r) continue;
    const x=Math.floor(SX/2+dx), z=Math.floor(SZ/2+dz);
    if(x<1||z<1||x>=SX-1||z>=SZ-1) continue;
    for(let y=SY-1;y>0;y--){ const b=getB(x,y,z); if(b===B.GRASS){ sx=x; sz=z; break outer; } else if(b!==B.AIR&&b!==B.WATER&&b!==B.LEAVES) break; }
  }
  player.pos.set(sx+0.5,25,sz+0.5);
  for(let y=SY-1;y>0;y--){ const b=getB(Math.floor(player.pos.x),y,Math.floor(player.pos.z)); if(b&&b!==B.WATER&&b!==B.LEAVES){ player.pos.y=y+1.01; break; } }
}
function solidAt(x,y,z){ const b=getB(Math.floor(x),Math.floor(y),Math.floor(z)); return b!==B.AIR&&b!==B.WATER; }
function collide(){
  const p=player.pos, w=player.w, h=player.h;
  // Y
  p.y+=player.vel.y*dt;
  if(player.vel.y<=0){
    // check feet
    if(hitBox()){ // move up
      // find ground
      p.y=Math.ceil(p.y-0.001); player.vel.y=0; player.onGround=true;
    } else player.onGround=false;
  } else { if(hitBox()){ p.y=Math.floor(p.y+h)-h-0.001; player.vel.y=0; } }
  // X
  p.x+=player.vel.x*dt;
  if(hitBox()){ if(player.vel.x>0) p.x=Math.floor(p.x+w)-w-0.001; else p.x=Math.ceil(p.x-w)+w+0.001; player.vel.x=0; }
  // Z
  p.z+=player.vel.z*dt;
  if(hitBox()){ if(player.vel.z>0) p.z=Math.floor(p.z+w)-w-0.001; else p.z=Math.ceil(p.z-w)+w+0.001; player.vel.z=0; }
  // bounds
  p.x=Math.max(1,Math.min(SX-1,p.x)); p.z=Math.max(1,Math.min(SZ-1,p.z));
  if(p.y<-10){ p.y=25; player.vel.set(0,0,0); }
  function hitBox(){
    const x0=Math.floor(p.x-w),x1=Math.floor(p.x+w),y0=Math.floor(p.y),y1=Math.floor(p.y+h-0.05),z0=Math.floor(p.z-w),z1=Math.floor(p.z+w);
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){ const b=getB(x,y,z); if(b!==B.AIR&&b!==B.WATER) return true; }
    return false;
  }
}
function inWater(){ const b=getB(Math.floor(player.pos.x),Math.floor(player.pos.y+0.4),Math.floor(player.pos.z)); return b===B.WATER; }

/* ---------- raycast (DDA) ---------- */
function raycast(maxD=8){
  const dir=new THREE.Vector3(); camera.getWorldDirection(dir);
  let x=Math.floor(camera.position.x),y=Math.floor(camera.position.y),z=Math.floor(camera.position.z);
  const stx=Math.sign(dir.x),sty=Math.sign(dir.y),stz=Math.sign(dir.z);
  const tDelta=new THREE.Vector3(Math.abs(1/(dir.x||1e-8)),Math.abs(1/(dir.y||1e-8)),Math.abs(1/(dir.z||1e-8)));
  let tMax=new THREE.Vector3(
    stx>0?(x+1-camera.position.x)*tDelta.x:(camera.position.x-x)*tDelta.x,
    sty>0?(y+1-camera.position.y)*tDelta.y:(camera.position.y-y)*tDelta.y,
    stz>0?(z+1-camera.position.z)*tDelta.z:(camera.position.z-z)*tDelta.z);
  let face=null, t=0;
  for(let i=0;i<64;i++){
    if(tMax.x<tMax.y&&tMax.x<tMax.z){ x+=stx; t=tMax.x; tMax.x+=tDelta.x; face=[-stx,0,0]; }
    else if(tMax.y<tMax.z){ y+=sty; t=tMax.y; tMax.y+=tDelta.y; face=[0,-sty,0]; }
    else { z+=stz; t=tMax.z; tMax.z+=tDelta.z; face=[0,0,-stz]; }
    if(t>maxD) return null;
    const b=getB(x,y,z);
    if(b&&b!==B.AIR&&b!==B.WATER){ return {x,y,z,face,block:b}; }
    if(b===B.WATER && t>maxD) return null;
  }
  return null;
}

/* ---------- highlight, particles ---------- */
const hl=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002,1.002,1.002)), new THREE.LineBasicMaterial({color:0x000000,transparent:true,opacity:0.6}));
hl.visible=false; scene.add(hl);
const particles=[];
const pGeo=new THREE.BoxGeometry(0.12,0.12,0.12);
function burst(x,y,z,block){
  const col={1:0x5fae3f,2:0x7a5230,3:0x888888,4:0x5b4128,5:0x2f7a24,6:0xe0d29a,7:0xb08a4f,8:0xcfe8ff,9:0x9e3d31,10:0x2f6fd6,11:0x222222,12:0xffffff,13:0x777777}[block]||0xffffff;
  for(let i=0;i<14;i++){
    const m=new THREE.Mesh(pGeo,new THREE.MeshBasicMaterial({color:col}));
    m.position.set(x+0.5+(Math.random()-.5)*.6,y+0.5+(Math.random()-.5)*.6,z+0.5+(Math.random()-.5)*.6);
    m.userData.v=new THREE.Vector3((Math.random()-.5)*4,Math.random()*4,(Math.random()-.5)*4);
    m.userData.life=0.6+Math.random()*0.4;
    scene.add(m); particles.push(m);
  }
}
function blip(freq=440,dur=0.07,type='square',vol=0.12){
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=vol;
    o.connect(g); g.connect(audioCtx.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+dur); o.stop(audioCtx.currentTime+dur);
  }catch{}
}
let audioCtx=null;

/* ---------- clouds ---------- */
const clouds=[];
{ const cg=new THREE.BoxGeometry(4,0.8,4); const cm=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.75});
  for(let i=0;i<24;i++){ const m=new THREE.Mesh(cg,cm); m.position.set(Math.random()*SX,30+Math.random()*3,Math.random()*SZ); scene.add(m); clouds.push(m); } }

/* ---------- input: keyboard/mouse ---------- */
const keys={};
addEventListener('keydown',e=>{ keys[e.code]=true;
  if(e.code==='Digit1')select(0); if(e.code==='Digit2')select(1); if(e.code==='Digit3')select(2);
  if(e.code==='Digit4')select(3); if(e.code==='Digit5')select(4); if(e.code==='Digit6')select(5);
  if(e.code==='Digit7')select(6); if(e.code==='Digit8')select(7); if(e.code==='Digit9')select(8);
  if(e.code==='KeyF') toggleFly();
  if(['Space','ArrowUp'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup',e=>keys[e.code]=false);
let locked=false;
renderer.domElement.addEventListener('click',()=>{ if(!isTouch && $('menu').classList.contains('hide')) renderer.domElement.requestPointerLock?.(); });
document.addEventListener('pointerlockchange',()=>{ locked=document.pointerLockElement===renderer.domElement; });
addEventListener('mousemove',e=>{ if(locked){ player.yaw-=e.movementX*0.0025; player.pitch-=e.movementY*0.0025; player.pitch=Math.max(-1.55,Math.min(1.55,player.pitch)); } });
renderer.domElement.addEventListener('mousedown',e=>{ if(!$('menu').classList.contains('hide'))return; if(!locked&&!isTouch){renderer.domElement.requestPointerLock?.();return;} if(e.button===0)doBreak(); if(e.button===2)doPlace(); });
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('wheel',e=>{ select((selIndex+(e.deltaY>0?1:HOTBAR.length-1))%HOTBAR.length); },{passive:true});

/* ---------- touch: joystick + look ---------- */
const joy={active:false,id:null,ox:0,oy:0,dx:0,dy:0};
const look={id:null,lx:0,ly:0};
const joyEl=$('joystick'), stickEl=$('stick');
function tPos(t){ return [t.clientX,t.clientY]; }
addEventListener('touchstart',e=>{
  if(!$('menu').classList.contains('hide')) return;
  for(const t of e.changedTouches){
    if(t.clientX<innerWidth*0.45 && t.clientY>innerHeight*0.35 && joy.id===null){
      joy.id=t.identifier; const r=joyEl.getBoundingClientRect();
      joy.ox=r.left+r.width/2; joy.oy=r.top+r.height/2; joy.dx=0; joy.dy=0;
    } else if(look.id===null && !(t.target.closest&&t.target.closest('#action-btns,#hotbar,#topbar'))){
      look.id=t.identifier; look.lx=t.clientX; look.ly=t.clientY; look.moved=0; look.t0=performance.now();
    }
  }
},{passive:false});
addEventListener('touchmove',e=>{
  for(const t of e.changedTouches){
    if(t.identifier===joy.id){
      let dx=t.clientX-joy.ox, dy=t.clientY-joy.oy;
      const m=Math.hypot(dx,dy), max=52;
      if(m>max){dx*=max/m;dy*=max/m;}
      joy.dx=dx/max; joy.dy=dy/max;
      stickEl.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
      e.preventDefault();
    } else if(t.identifier===look.id){
      const dx=t.clientX-look.lx, dy=t.clientY-look.ly;
      look.moved=(look.moved||0)+Math.abs(dx)+Math.abs(dy);
      player.yaw-=dx*0.005; player.pitch-=dy*0.005;
      player.pitch=Math.max(-1.55,Math.min(1.55,player.pitch));
      look.lx=t.clientX; look.ly=t.clientY;
      e.preventDefault();
    }
  }
},{passive:false});
addEventListener('touchend',e=>{
  for(const t of e.changedTouches){
    if(t.identifier===joy.id){ joy.id=null; joy.dx=0; joy.dy=0; stickEl.style.transform='translate(-50%,-50%)'; }
    if(t.identifier===look.id){ look.id=null; }
  }
});
// hold-to-repeat break/place
let holdTimer=null, holdFn=null;
function bindHold(el,fn){
  const start=e=>{e.preventDefault(); fn(); holdFn=fn; clearInterval(holdTimer); holdTimer=setInterval(fn,260);};
  const end=()=>{clearInterval(holdTimer); holdTimer=null;};
  el.addEventListener('touchstart',start,{passive:false});
  el.addEventListener('touchend',end); el.addEventListener('touchcancel',end);
  el.addEventListener('mousedown',start); el.addEventListener('mouseup',end); el.addEventListener('mouseleave',end);
}
bindHold($('btn-break'),()=>doBreak());
bindHold($('btn-place'),()=>doPlace());
$('btn-jump').addEventListener('touchstart',e=>{e.preventDefault();keys.Space=true;},{passive:false});
$('btn-jump').addEventListener('touchend',()=>keys.Space=false);
$('btn-jump').addEventListener('mousedown',()=>keys.Space=true);
$('btn-jump').addEventListener('mouseup',()=>keys.Space=false);
$('btn-down').addEventListener('touchstart',e=>{e.preventDefault();keys.ShiftLeft=true;},{passive:false});
$('btn-down').addEventListener('touchend',()=>keys.ShiftLeft=false);

/* ---------- actions ---------- */
function doBreak(){
  const h=raycast(8); if(!h) return;
  if(h.block===B.BEDROCK){ toast('Bedrock is unbreakable'); return; }
  setB(h.x,h.y,h.z,B.AIR); burst(h.x,h.y,h.z,h.block); blip(220,0.08,'square'); rebuildAt(h.x,h.z); autosave();
}
function doPlace(){
  const h=raycast(8); if(!h) return;
  const nx=h.x+h.face[0], ny=h.y+h.face[1], nz=h.z+h.face[2];
  if(!inW(nx,ny,nz)) return;
  const cur=getB(nx,ny,nz);
  if(cur!==B.AIR&&cur!==B.WATER) return;
  // don't place inside player
  const p=player.pos,w=player.w,hh=player.h;
  if(nx+1>p.x-w&&nx<p.x+w&&nz+1>p.z-w&&nz<p.z+w&&ny+1>p.y&&ny<p.y+hh){ toast('Too close!'); return; }
  setB(nx,ny,nz,HOTBAR[selIndex]); blip(520,0.07,'triangle'); rebuildAt(nx,nz); autosave();
}
function toggleFly(){ player.fly=!player.fly; player.vel.set(0,0,0); $('btn-fly').classList.toggle('on',player.fly); $('btn-down').classList.toggle('hidden',!player.fly); toast(player.fly?'✈️ Fly ON — Jump=up, Down=down':'🚶 Walk mode'); blip(660,0.1,'sine'); }
$('btn-fly').onclick=toggleFly;
$('btn-day').onclick=()=>{ dayT=(dayT+0.25)%1; toast('⏰ Time changed'); };
$('btn-save').onclick=()=>{ save(); toast('💾 Saved!'); };
$('btn-menu').onclick=()=>{ $('menu').classList.remove('hide'); $('btn-continue').classList.remove('hidden'); document.exitPointerLock?.(); };

/* ---------- hotbar ---------- */
function buildHotbar(){
  const hb=$('hotbar'); hb.innerHTML='';
  HOTBAR.forEach((b,i)=>{
    const d=document.createElement('div'); d.className='slot'+(i===selIndex?' sel':'');
    d.innerHTML=`<span class="num">${i+1}</span><span class="ico">${BLOCKS[b].icon}</span>${BLOCKS[b].name}`;
    d.onclick=()=>select(i);
    hb.appendChild(d);
  });
}
function select(i){ selIndex=i; buildHotbar(); blip(700,0.04,'sine',0.06); }

/* ---------- save/load ---------- */
const SAVE_KEY='mc3d-save-v1';
function encWorld(){
  let bin='';
  const CHUNK=8192;
  for(let i=0;i<world.length;i+=CHUNK){
    const sub=world.subarray(i,Math.min(i+CHUNK,world.length));
    let s='';
    for(let j=0;j<sub.length;j++) s+=String.fromCharCode(sub[j]);
    bin+=btoa(s);
    if(i+CHUNK<world.length) bin+='|';
  }
  return bin;
}
function decWorld(str){
  const parts=str.split('|');
  let o=0;
  for(const p of parts){
    const bin=atob(p);
    for(let i=0;i<bin.length&&o<world.length;i++,o++) world[o]=bin.charCodeAt(i);
  }
}
function save(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify({seed:SEED, blocks:encWorld(), px:+player.pos.x.toFixed(2), py:+player.pos.y.toFixed(2), pz:+player.pos.z.toFixed(2), yaw:+player.yaw.toFixed(3)})); }catch(e){}
}
function load(){
  try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)); if(!s||!s.blocks) return false;
    decWorld(s.blocks);
    player.pos.set(s.px,s.py,s.pz); player.yaw=s.yaw||0; SEED=s.seed; return true;
  }catch{ return false; }
}
let saveT=0; function autosave(){ const n=performance.now(); if(n-saveT>2500){ saveT=n; save(); } }
$('seed').value=Math.floor(Math.random()*99999);
$('btn-new').onclick=()=>{ $('seed').value=Math.floor(Math.random()*99999); };
$('btn-reset').onclick=()=>{ localStorage.removeItem(SAVE_KEY); genWorld(parseInt($('seed').value)||1337); buildAll(); player.pos.set(SX/2+0.5,25,SZ/2+0.5); player.vel.set(0,0,0); spawnTop(); toast('🌍 New world!'); };
$('btn-continue').onclick=()=>$('menu').classList.add('hide');
$('btn-play').onclick=()=>{
  const wantSeed=parseInt($('seed').value)||1337;
  if(wantSeed!==SEED || chunkMeshes.size===0){ genWorld(wantSeed); buildAll(); player.pos.set(SX/2+0.5,25,SZ/2+0.5); player.vel.set(0,0,0); spawnTop(); }
  $('menu').classList.add('hide');
  $('hud').classList.remove('hidden');
  if(!isTouch) renderer.domElement.requestPointerLock?.();
  blip(880,0.15,'sine');
};

/* ---------- boot world ---------- */
genWorld(1337); buildAll(); spawnTop(); buildHotbar();
if(load()){ buildAll(); $('btn-continue').classList.remove('hidden'); }
$('hud').classList.add('hidden');

/* ---------- day cycle ---------- */
let dayT=0.35;
function updateSky(dt){
  dayT=(dayT+dt*0.004)%1; // ~4 min day
  const ang=dayT*Math.PI*2;
  sun.position.set(Math.cos(ang)*60, Math.sin(ang)*60+10, 20);
  const day=THREE.MathUtils.clamp(Math.sin(ang)*1.4+0.35,0,1);
  const night=1-day;
  const sky=new THREE.Color().setHSL(0.58,0.55,THREE.MathUtils.lerp(0.04,0.68,day));
  scene.background=sky; scene.fog.color.copy(sky);
  sun.intensity=THREE.MathUtils.lerp(0.08,1.6,day);
  hemi.intensity=THREE.MathUtils.lerp(0.25,0.95,day);
  $('btn-day').textContent=day>0.4?'☀️':'🌙';
}

/* ---------- main loop ---------- */
const clock=new THREE.Clock();
let dt=0.016, fpsA=60, statT=0;
function tick(){
  requestAnimationFrame(tick);
  dt=Math.min(clock.getDelta(),0.05);
  const playing=$('menu').classList.contains('hide');

  if(playing){
    // movement input
    let ix=0,iz=0;
    if(keys.KeyW||keys.ArrowUp)iz+=1; if(keys.KeyS||keys.ArrowDown)iz-=1;
    if(keys.KeyA||keys.ArrowLeft)ix-=1; if(keys.KeyD||keys.ArrowRight)ix+=1;
    ix+=joy.dx; iz-=joy.dy;
    const m=Math.hypot(ix,iz); if(m>1){ix/=m;iz/=m;}
    const speed=player.fly?10:4.6*(inWater()?0.6:1);
    // standard FPS: forward = (-sin yaw, -cos yaw)
    const fx=-Math.sin(player.yaw), fz=-Math.cos(player.yaw);
    const rx=Math.cos(player.yaw), rz=-Math.sin(player.yaw);
    let tvx=(fx*iz+rx*ix)*speed, tvz=(fz*iz+rz*ix)*speed;
    if(player.fly){
      player.vel.x+=(tvx-player.vel.x)*Math.min(1,dt*8);
      player.vel.z+=(tvz-player.vel.z)*Math.min(1,dt*8);
      let vy=0; if(keys.Space)vy+=8; if(keys.ShiftLeft)vy-=8;
      player.vel.y+=(vy-player.vel.y)*Math.min(1,dt*8);
      player.pos.x+=player.vel.x*dt; // fly: no collision? keep collision for walls
      player.pos.z+=player.vel.z*dt;
      player.pos.y+=player.vel.y*dt;
      // simple wall clamp
      const w=player.w;
      if(solidAt(player.pos.x-w,player.pos.y,player.pos.z)||solidAt(player.pos.x+w,player.pos.y,player.pos.z)) player.pos.x-=player.vel.x*dt;
      if(solidAt(player.pos.x,player.pos.y,player.pos.z-w)||solidAt(player.pos.x,player.pos.y,player.pos.z+w)) player.pos.z-=player.vel.z*dt;
      if(solidAt(player.pos.x,player.pos.y,player.pos.z)) player.pos.y-=player.vel.y*dt;
      player.pos.x=Math.max(1,Math.min(SX-1,player.pos.x)); player.pos.z=Math.max(1,Math.min(SZ-1,player.pos.z));
      player.pos.y=Math.max(1,Math.min(SY+6,player.pos.y));
    } else {
      player.vel.x+=(tvx-player.vel.x)*Math.min(1,dt*12);
      player.vel.z+=(tvz-player.vel.z)*Math.min(1,dt*12);
      if(inWater()){ player.vel.y-=8*dt; player.vel.y*=0.94; if(keys.Space)player.vel.y+=30*dt; player.vel.y=Math.max(-4,Math.min(4,player.vel.y)); }
      else { player.vel.y-=26*dt; if(keys.Space&&player.onGround){player.vel.y=8.6;player.onGround=false;blip(300,0.06,'sine',0.05);} }
      collide();
    }
    camera.position.set(player.pos.x,player.pos.y+player.eye,player.pos.z);
    camera.rotation.set(0,0,0); camera.rotation.order='YXZ';
    camera.rotation.y=player.yaw; camera.rotation.x=player.pitch;

    // highlight
    const h=raycast(8);
    if(h){ hl.visible=true; hl.position.set(h.x+0.5,h.y+0.5,h.z+0.5);
      const nm=$('block-highlight-name'); nm.style.display='block'; nm.textContent=BLOCKS[h.block]?.name||'';
    } else { hl.visible=false; $('block-highlight-name').style.display='none'; }

    // clouds drift
    for(const c of clouds){ c.position.x+=dt*1.2; if(c.position.x>SX+6)c.position.x=-6; }
    // particles
    for(let i=particles.length-1;i>=0;i--){ const p=particles[i];
      p.userData.life-=dt; p.userData.v.y-=12*dt;
      p.position.addScaledVector(p.userData.v,dt);
      p.rotation.x+=dt*5; p.rotation.y+=dt*4;
      if(p.userData.life<=0){ scene.remove(p); p.material.dispose(); particles.splice(i,1); } }
  }

  updateSky(playing?dt:0.0005);
  renderer.render(scene,camera);

  // stats
  fpsA+=(1/Math.max(dt,1e-4)-fpsA)*0.05; statT+=dt;
  if(statT>0.4){ statT=0; $('stats').textContent=`${Math.round(fpsA)} FPS · ${Math.floor(player.pos.x)},${Math.floor(player.pos.y)},${Math.floor(player.pos.z)}${player.fly?' · FLY':''}`; }
}
tick();

addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
setInterval(()=>{ if(!$('menu').classList.contains('hide'))return; save(); },15000);

// debug/testing handle (harmless in production)
window.__mc={ player, getB, setB, doBreak, doPlace, rebuildAt, select, toggleFly,
  scene, chunkMeshes, B, TRANSPARENT, tileFor,
  stats(){ const o=[]; for(const [k,v] of chunkMeshes) o.push(k+':'+v.map(m=>m.geometry.index.count+(m.material.transparent?'(t)':'(o)')).join('+')); return o; },
  get HOTBAR(){return HOTBAR;}, get sel(){return selIndex;} };
