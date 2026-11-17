import fs from 'node:fs';import vm from 'node:vm';
const data=JSON.parse(fs.readFileSync('docs/richgo-20to25-top300-audit-20261118.json','utf8')).audited;
if(data.length!==300)throw Error('300 audit rows required');
const c={CAPT:25,PICKS:[],FARD:{},PLAT:{},UGEO:{},HAK:{},console};c.window=c;vm.createContext(c);
for(const file of ['apt-fard.js','apt-univ10.js','apt-univ15.js','apt-univ20.js','apt-univ30.js','apt-univadd.js'])vm.runInContext(fs.readFileSync('public/'+file,'utf8'),c,{filename:file});
const picks=new Map();for(const p of c.PICKS){const k=p.n+'|'+p.area;if(!picks.has(k))picks.set(k,p);}
const uniqueIds=[...new Set(data.map(d=>d.richgoId).filter(Boolean))];
const urls=uniqueIds.map(id=>'https://m.richgo.ai/realty/danji/'+id);
function geo(html){
  // JSON-LD structured location data, explicitly attached to an individual Richgo apartment page.
  const options=[
    /"geo":\{"@type":"GeoCoordinates","latitude":([0-9.]+),"longitude":([0-9.]+)\}/,
    /"latitude":([0-9.]+),"longitude":([0-9.]+)/
  ];for(let rx of options){let m=html.match(rx);if(m)return {lat:+m[1],lng:+m[2]};}
  return null;
}
async function get(url){for(let attempt=0;attempt<3;attempt++){try{let r=await fetch(url,{headers:{'User-Agent':'ApartmentMapResearch/1.0 (coordinates-only audit)'},signal:AbortSignal.timeout(28000)});let s=await r.text();if(r.status===200)return {status:r.status,coords:geo(s)};if(r.status!==429&&r.status<500)return {status:r.status};}catch(e){if(attempt===2)return {status:0,error:String(e)};}await new Promise(r=>setTimeout(r,700*(attempt+1)));}return {status:0};}
async function pool(list,n,fn){let ix=0,o=new Array(list.length);await Promise.all(Array.from({length:n},async()=>{while(ix<list.length){let i=ix++;o[i]=await fn(list[i],i);await new Promise(r=>setTimeout(r,100));}}));return o;}
const results=await pool(urls,5,get),source=new Map(uniqueIds.map((id,i)=>[id,results[i]]));
function dist(a,b){const d=Math.PI/180,R=6371000,l=(b.lat-a.lat)*d,k=(b.lng-a.lng)*d;const q=Math.sin(l/2)**2+Math.cos(a.lat*d)*Math.cos(b.lat*d)*Math.sin(k/2)**2;return Math.round(2*R*Math.asin(Math.min(1,Math.sqrt(q))))}
const rows=data.map(d=>{const p=picks.get(d.name+'|'+d.area),r=source.get(d.richgoId),rich=r?.coords||null,site=p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)?{lat:p.lat,lng:p.lng}:null,metres=site&&rich?dist(site,rich):null;
  return {rank:d.rank,name:d.name,area:d.area,richgoId:d.richgoId,richgoName:d.richgoName,siteLat:site?.lat??null,siteLng:site?.lng??null,richgoLat:rich?.lat??null,richgoLng:rich?.lng??null,metres,status:metres===null?'좌표없음':metres<=500?'500m이내':metres<=1500?'500~1500m재검토':'1500m초과재검토',httpStatus:r?.status??0,error:r?.error||''};
});
const headers=['rank','name','area','richgoId','richgoName','siteLat','siteLng','richgoLat','richgoLng','metres','status','httpStatus','error'];
const cell=v=>{let s=String(v??'');return /[,"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
fs.writeFileSync('docs/richgo-20to25-top300-coordinate-audit-20261118.csv',[headers,...rows.map(d=>headers.map(h=>d[h]))].map(r=>r.map(cell).join(',')).join('\n')+'\n');
const summary={total:rows.length,uniqueRichgoPages:uniqueIds.length,withBothCoords:rows.filter(x=>x.metres!==null).length,within500m:rows.filter(x=>x.status==='500m이내').length,between500and1500:rows.filter(x=>x.status==='500~1500m재검토').length,over1500:rows.filter(x=>x.status==='1500m초과재검토').length,missingCoordinates:rows.filter(x=>x.metres===null).length,review:rows.filter(x=>x.metres===null||x.metres>500).map(x=>({rank:x.rank,name:x.name,area:x.area,metres:x.metres,source:x.richgoId,status:x.status}))};
fs.writeFileSync('docs/richgo-20to25-top300-coordinate-summary-20261118.json',JSON.stringify(summary,null,2)+'\n');
console.log('COORDINATES '+JSON.stringify(summary,null,2));
if(summary.withBothCoords!==300||summary.within500m!==300)throw new Error('coordinate mismatch in ranked 300 complexes: '+JSON.stringify(summary.review));
