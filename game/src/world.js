import {Mesh,rgb} from './mesh.js';

export const streets = [-300,-225,-150,-75,0,75,150,225,300];
export const avenues = [-300,-225,-150,-75,0,75,150];
export const boulevard = 150;
export const limits = {west:-323,east:232,north:-334,south:370};
export const docks = {x:75,z:300};
export const spawn = {x:159,z:-67,yaw:0};
const gold=rgb('ffcc89'), white=rgb('ffe7ca'), asphalt=rgb('42364f');
const concrete=rgb('bc8a8a'), deep=rgb('282340'), teal=rgb('69ffe0'), pink=rgb('ff71b9');
const hotelNames=['CANARY','CASPIAN','MIRAGE','SOLANA','AZURE','LANTERN','NACRE','SUNDIAL'];
const palette=['e9947e','a86998','8786ac','6a789a','d89a8b','dba59a','a6a0c4'];
const rand = (seed) => {
  let state=seed;
  return () => {
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    return state/4294967296;
  };
};

function palm(mesh,x,z,h,skew) {
  const bark=rgb('9c5e61');
  for(let i=0;i<4;i++) mesh.box(x+skew*i/4,h*(i+.5)/4,z,.48-i*.07,h/4+.08,.45,bark,0,-skew/h);
  const tip=[x+skew,h,z];
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;
    const dx=Math.cos(angle), dz=Math.sin(angle);
    const reach=3.6+(i%3)*.55;
    const center=[tip[0]+dx*reach*.54,h+.55,z+dz*reach*.54];
    const leaf=rgb(i%2?'4f8b76':'497165');
    const a=[center[0]+dz*.8,center[1]-.2,center[2]-dx*.8];
    const b=[center[0]-dz*.8,center[1]-.2,center[2]+dx*.8];
    const end=[tip[0]+dx*reach,h-1.25,z+dz*reach];
    mesh.triangle(tip,a,center,leaf);
    mesh.triangle(tip,center,b,leaf,.8);
    mesh.triangle(center,a,end,leaf);
    mesh.triangle(center,end,b,leaf,.8);
  }
}

const letters = {
  A:['010','101','111','101','101'], C:['111','100','100','100','111'],
  D:['110','101','101','101','110'], E:['111','100','110','100','111'],
  I:['111','010','010','010','111'], L:['100','100','100','100','111'],
  M:['101','111','101','101','101'], N:['101','111','111','111','101'],
  P:['110','101','110','100','100'], R:['110','101','110','101','101'],
  S:['111','100','111','001','111'], T:['111','010','010','010','010'],
  U:['101','101','101','101','111'], Y:['101','101','010','010','010'],
  Z:['111','001','010','100','111'], H:['101','101','111','101','101']
};
function sign(mesh,text,x,y,z,cell,color) {
  for(let i=0;i<text.length;i++){
    const glyph=letters[text[i]];
    if(!glyph) continue;
    for(let row=0;row<5;row++) for(let col=0;col<3;col++){
      if(glyph[row][col]==='1') mesh.box(x,y-row*cell,z+(i*4+col-text.length*2)*cell,.08,cell*.93,cell*.93,color);
    }
  }
}

function building(mesh,obstacles,x,z,w,d,h,color,hotel) {
  const rim=hotel?rgb('ffe3bb'):rgb('8f7b9a');
  mesh.box(x,h/2,z,w,h,d,color);
  mesh.box(x,h+.42,z,w+.5,.84,d+.5,rim);
  mesh.box(x,h+1.4,z,w*.66,2,d*.75,color);
  obstacles.push({x,z,w,d,h:h+2.4});
  for(let y=3.8;y<h-1;y+=hotel?3.7:4.5){
    const lit=rgb((Math.round(y)+Math.round(z))%3?'ffdba2':'544b76');
    if(hotel){
      mesh.box(x+w/2+.06,y+1.22,z,.15,.23,d*.96,hotel.tint);
      mesh.box(x+w/2+.09,y,z,.19,1.42,d*.78,deep);
    }
    for(let a=-d/2+2.4;a<d/2-1;a+=4.2){
      mesh.box(x+w/2+.22,y,z+a,.12,1.35,2.45,lit);
      if(!hotel) mesh.box(x-w/2-.05,y,z+a,.10,1.5,2.25,lit);
    }
    for(let a=-w/2+2.4;a<w/2-1;a+=4.5){
      mesh.box(x+a,y,z+d/2+.05,2.45,1.42,.11,lit);
      mesh.box(x+a,y,z-d/2-.05,2.45,1.42,.11,lit);
    }
  }
  if(hotel){
    const front=x+w/2;
    mesh.box(front+1.12,3,z,2.7,.5,d*.64,hotel.tint);
    mesh.box(front+.1,h-1.55,z,.28,2.65,d*.82,deep);
    sign(mesh,hotel.name,front+.26,h-.65,z,.46,gold);
    for(const end of [-1,1]) mesh.box(front+.12,(h+3)/2,z+end*(d/2-.65),.28,h-3,.4,hotel.tint);
  }
}

export function createCity() {
  const mesh=new Mesh();
  const obstacles=[];
  const random=rand(438109);
  const colors=palette.map(rgb);
  mesh.box(-73,-.65,0,510,1.2,692,rgb('765a6e'));
  mesh.box(191,-.35,0,87,.6,692,rgb('deb18c'));
  mesh.box(447,-.48,0,440,.6,2100,rgb('3c7a90'));
  for(let i=0;i<1250;i++){
    const x=225+random()*326, z=-460+random()*920;
    mesh.box(x,-.16,z,.2+random()*1.5,.025,1+random()*13,rgb(i%5?'6299a9':'aed8c9'));
  }
  for(let i=0;i<80;i++){
    const x=229+Math.sin(i*.38)*2;
    mesh.box(x,-.13, -340+8.7*i,.65,.035,7,rgb('feeed2'));
  }
  for(const x of avenues){
    mesh.box(x,.002,0,x===boulevard?23:16,.04,666,asphalt);
    for(let z=-327;z<327;z+=7){
      if(streets.some(line=>Math.abs(line-z)<12)) continue;
      mesh.box(x,.037,z,.19,.018,3.5,gold);
      if(x===boulevard) for(const lane of [-5.6,5.6]) mesh.box(x+lane,.037,z,.16,.019,3.5,white);
    }
  }
  for(const z of streets){
    mesh.box(-71,.017,z,467,.035,16,asphalt);
    for(let x=-303;x<154;x+=7){
      if(avenues.some(line=>Math.abs(line-x)<12)) continue;
      mesh.box(x,.043,z,3.7,.017,.17,gold);
    }
    for(let i=0;i<7;i++){
      mesh.box(144+i*1.9,.049,z+12,1,.019,3,white);
      mesh.box(144+i*1.9,.049,z-12,1,.019,3,white);
    }
  }
  for(let row=0;row<8;row++) for(let col=0;col<6;col++){
    const x=avenues[col]+37.5, z=streets[row]+37.5;
    mesh.box(x,.14,z,col===5?55:59,.27,59,concrete);
    if(row===7 && col>=3) continue;
    const hotel=col===5?{name:hotelNames[row],tint:row%2?teal:pink}:null;
    if(hotel){
      building(mesh,obstacles,x-1,z,38,46,16+random()*14,colors[row%colors.length],hotel);
    } else {
      const tower=col>0&&col<5&&row>0&&row<6;
      building(mesh,obstacles,x-12,z-12,17+random()*7,17+random()*8,9+random()*(tower?66:24),colors[(col+row)%7]);
      building(mesh,obstacles,x+12,z+11,18+random()*7,17+random()*8,8+random()*(tower?54:18),colors[(col+row+3)%7]);
    }
  }
  mesh.box(168,.11,0,10,.25,665,white);
  for(let z=-321;z<329;z+=14){
    palm(mesh,178+(Math.floor(z/14)%3)*1.6,z,7+random()*3,random()*1.1-.55);
    if(Math.floor(z/14)%2===0){
      mesh.box(163,3,z,.17,6,.17,deep);
      mesh.box(161.8,5.94,z,2.55,.15,.22,deep);
      mesh.box(160.7,5.83,z,.54,.13,.4,gold);
    }
  }
  for(let i=0;i<10;i++){
    const z=-314+i*61;
    mesh.box(207,1.2,z,.14,2.4,.14,white);
    const tip=[207,2.6,z];
    for(let j=0;j<8;j++){
      const a=j*Math.PI/4,b=a+Math.PI/4;
      mesh.triangle(tip,[207+Math.cos(a)*2,1.65,z+Math.sin(a)*2],[207+Math.cos(b)*2,1.65,z+Math.sin(b)*2],j%2?white:rgb('df667b'));
    }
  }
  mesh.box(37,-.03,315,215,.21,26,deep);
  mesh.box(37,-.45,349,215,.73,49,rgb('675263'));
  for(const x of [-65,4,80,140]){
    mesh.box(x,.01,356,.25,.12,32,gold);
    mesh.box(x,1,372,1.9,2,1.9,deep);
  }
  for(let i=0;i<30;i++){
    const x=-68+(i%10)*18, z=276+Math.floor(i/10)*14+(i%3)*1.4;
    if(Math.abs(x-75)<9||Math.abs(x)<8) continue;
    const color=colors[i%7];
    mesh.box(x,1.55,z,10,3.1,4.5,color);
    obstacles.push({x,z,w:10,d:4.5,h:i%4===0?6.2:3.1});
    if(i%4===0) mesh.box(x,4.65,z,10,3.1,4.5,color);
    for(let j=-4;j<=4;j++){
      const seam=color.map(channel=>channel*.72);
      mesh.box(x+j,1.55,z+2.26,.13,2.8,.07,seam);
      mesh.box(x+j,1.55,z-2.26,.13,2.8,.07,seam);
    }
    mesh.box(x-2.95,2.15,z-2.3,2.2,.44,.06,gold);
  }
  for(const x of [-52,27,108]){
    for(const z of [285,321]) mesh.box(x,14,z,1.1,28,1.1,gold);
    mesh.box(x,27,303,1.25,1.4,44,gold);
    mesh.box(x,22,303,.28,10,.28,deep);
  }
  const ramps=[{x:75,z:319},{x:0,z:318}];
  for(const {x,z} of ramps){
    const a=[x-3,.07,z-4], b=[x+3,.07,z-4], c=[x+3,2.5,z+4], d=[x-3,2.5,z+4];
    mesh.quad(a,b,c,d,rgb('ad7768'));
    for(const offset of [-2.75,2.75]) mesh.quad([x+offset-.1,.08,z-4],[x+offset+.1,.08,z-4],[x+offset+.1,2.51,z+4],[x+offset-.1,2.51,z+4],gold);
  }
  const clinicX=-123,clinicZ=-138;
  mesh.box(clinicX,4.5,clinicZ,21,9,12,rgb('beb3b3'));
  mesh.box(clinicX,9.31,clinicZ,22,.52,13,white);
  mesh.box(clinicX,1.55,clinicZ-6.08,3.4,3.1,.2,deep);
  mesh.box(clinicX-5,5.2,clinicZ-6.08,.5,2,.22,pink);
  mesh.box(clinicX-5,5.2,clinicZ-6.08,2,.5,.22,pink);
  sign(mesh,'MERCY',clinicX-10.58,7,clinicZ,.42,teal);
  obstacles.push({x:clinicX,z:clinicZ,w:21,d:12,h:9.6});
  return {mesh,obstacles,ramps};
}

export function clearSpace(city,x,z,radius) {
  if(x-radius<limits.west||x+radius>limits.east||z-radius<limits.north||z+radius>limits.south) return false;
  if(z>331&&(x-radius<-70||x+radius>144)) return false;
  return !city.obstacles.some(b=>Math.abs(b.x-x)<b.w/2+radius&&Math.abs(b.z-z)<b.d/2+radius);
}

export function blocksAt(city,x,y,z,radius) {
  return y<radius||city.obstacles.some(box=>y<box.h+radius&&Math.abs(box.x-x)<box.w/2+radius&&Math.abs(box.z-z)<box.d/2+radius);
}

export function districtAt(x,z) {
  if(z>248&&x<147) return 'Bellwether Docks';
  if(x>175) return 'Saffron Beach';
  if(x>112) return 'Canary Boulevard';
  return 'Lumen Ward';
}
