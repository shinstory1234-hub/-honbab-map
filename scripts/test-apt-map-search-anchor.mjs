import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../public/apt-map.html',import.meta.url),'utf8');
for(const item of source.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(item[1]);

const a=source.indexOf('function pointNearViewport(');
const b=source.indexOf('function browseMap(){',a);
assert.ok(a>=0&&b>a,'Map-search release logic missing');

class LatLng{
  constructor(lat,lng){this.lat=lat;this.lng=lng;}
  getLat(){return this.lat;}
  getLng(){return this.lng;}
}
const hit=new LatLng(37.390,126.960);
const boundsAt=(lat,lng)=>({
  getSouthWest:()=>new LatLng(lat-.008,lng-.010),
  getNorthEast:()=>new LatLng(lat+.008,lng+.010)
});
let center=[37.390,126.960];
const map={getBounds:()=>boundsAt(...center)};
const D=[{n:'평촌어바인퍼스트',_pos:hit},{n:'다른 아파트',_pos:new LatLng(37.410,126.990)}];
const state={q:'어바인',sel:null};
const matches=(d)=>d.n.includes(state.q);
const check=new Function('map','D','state','textMatches','mobile','document','snapTo','performance','browseMap','qT','manualZoomUntil',
 source.slice(a,b)+';return {pointNearViewport,shouldReleaseMapFocus};');
const ui=check(map,D,state,matches,()=>false,{activeElement:null},()=>{},performance,()=>{},null,0);
assert.equal(ui.shouldReleaseMapFocus(),false,'Search result at map center should remain active');
center=[37.395,126.964];
assert.equal(ui.shouldReleaseMapFocus(),false,'Small map drag should preserve query');
center=[37.406,126.970];
assert.equal(ui.shouldReleaseMapFocus(),false,'Nearby view remains anchored to searched apartments');
center=[37.440,127.035];
assert.equal(ui.shouldReleaseMapFocus(),true,'Moving to distant district should release search');
state.q='';
state.sel=0;
center=[37.395,126.964];
assert.equal(ui.shouldReleaseMapFocus(),false,'Selected apartment should survive small drag');
center=[37.440,127.035];
assert.equal(ui.shouldReleaseMapFocus(),true,'Selected apartment may be released far away');
state.sel=null;
assert.equal(ui.shouldReleaseMapFocus(),false,'Unfiltered map should never be force-released');
assert.match(source,/addListener\(map,'dragstart',beginManualMapMove\)/);
assert.match(source,/addListener\(map,'dragend',/);
assert.doesNotMatch(source,/addListener\(map,'click',browseMap\)/);
console.log('PASS: small drag keeps search and selection, far move releases, tap does not clear');
