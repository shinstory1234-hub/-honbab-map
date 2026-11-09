import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const [before,after]=process.argv.slice(2);
function setup(root){
 const html=fs.readFileSync(root+'/public/apt-map.html','utf8');
 const source=html.slice(html.indexOf('let map,pins=[];'),html.indexOf('/* ── 바텀시트 ── */'));
 const node={clientWidth:800,clientHeight:600,textContent:'',addEventListener(){}};
 const c={created:0,offset:0,level:9,frames:[],state:{sel:null,q:''},D:Array.from({length:2000},(_,i)=>({rank:i+1,score:2000-i,p:80000,s:'test',tier:{c:'red'},_pos:{x:(i%50)*100,y:Math.floor(i/50)*80},allowed:true})),
  $:()=>node,visible:d=>d.allowed,short:String,cashOf:d=>d.p,esc:String,addEventListener(){},
  requestAnimationFrame:fn=>{c.frames.push(fn);return c.frames.length;},
  document:{createElement:()=>({style:{setProperty(){}},classList:{toggle(){}},addEventListener(){},innerHTML:''})},
  kakao:{maps:{CustomOverlay:class{constructor(){c.created++;}setMap(){}setPosition(){}setZIndex(){}}}}
 };vm.createContext(c);vm.runInContext(source,c);
 vm.runInContext('map={getLevel:()=>level,getProjection:()=>({containerPointFromCoords:p=>({x:p.x-offset,y:p.y})})};D.forEach((d,i)=>addPin(i));updatePins();',c);
 return c;
}
const a=setup(before),b=setup(after);
assert.equal(a.created,2000);assert.equal(b.created,0,'off-screen overlays must not be created');
for(const action of ['', 'offset=500;level=6;', 'state.sel=10;state.q="test";', 'D.forEach((d,i)=>d.allowed=i%3===0);']){
 for(const c of [a,b])vm.runInContext(action+'renderMap();updatePins();',c);
 const result=c=>vm.runInContext('JSON.stringify(pins.filter(o=>o.on).map(o=>o.i))',c);
 assert.equal(result(b),result(a),'visible map pins must match');
}
vm.runInContext('queueMap();queueMap();queueMap();',b);assert.equal(b.frames.length,1,'coalesce map renders');b.frames[0]();
assert.ok(b.created<400,'create only encountered visible overlays');
console.log(JSON.stringify({pass:true,total:2000,beforeCreated:a.created,afterCreated:b.created,visiblePinsMatch:true,frameCoalescing:true}));
