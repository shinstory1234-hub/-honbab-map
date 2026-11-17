/* One-off read-only 300-complex comparison with Richgo's public SEO detail pages.
 * Avoid Richgo's MCP: its published terms explicitly prohibit mass collection via MCP.
 * Fetch a bounded, fixed list of 300 ranked complexes; no site-wide crawling.
 */
import fs from 'node:fs';
import vm from 'node:vm';
const source='docs/richgo-20to25-top300-20261114-snapshot.csv';
function parseCSV(s){const out=[];let row=[],cell='',q=false;for(let i=0;i<s.length;i++){const v=s[i];if(q){if(v==='"'&&s[i+1]==='"'){cell+='"';i++;}else if(v==='"')q=false;else cell+=v;}else if(v==='"')q=true;else if(v===','){row.push(cell);cell='';}else if(v==='\n'){row.push(cell.replace(/\r$/,''));out.push(row);row=[];cell='';}else cell+=v;}if(row.length||cell){row.push(cell.replace(/\r$/,''));out.push(row);}return out;}
const table=parseCSV(fs.readFileSync(source,'utf8').replace(/^\ufeff/,''));
const ranks=table.slice(1).map(r=>({rank:+r[1],name:r[2],area:r[3],py:+r[4],price:+r[5],score:+r[6],year:+r[7],units:+r[8],key:r[12]}));
if(ranks.length!==300||new Set(ranks.map(x=>x.rank)).size!==300||new Set(ranks.map(x=>x.key)).size!==300)throw Error('ranked 300 list missing or duplicate');
function region(area){const p=area.split(' ');if(p[0]==='서울')return ['서울',p[1]];const m={'성남':'성남시','수원':'수원시','화성':'화성시','용인':'용인시'};return ['경기',m[p[0]]?m[p[0]]+' '+p[1]:p[0]];}
const norm=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'').replace(/아파트/g,'');
const squish=x=>norm(x).replace(/단지|차|동/g,'');
function similarity(a,b){
 a=squish(a);b=squish(b);if(a===b)return 1;
 if(!a.length||!b.length)return 0;
 const min=Math.min(a.length,b.length),max=Math.max(a.length,b.length);
 if(a.includes(b)||b.includes(a))return .8+.2*min/max;
 const ac=new Map(),pair=s=>{const ar=[];for(let i=0;i<s.length-1;i++)ar.push(s.slice(i,i+2));return ar};
 const aa=pair(a),bb=pair(b);for(const x of aa)ac.set(x,(ac.get(x)||0)+1);let hit=0;
 for(const x of bb){const n=ac.get(x)||0;if(n){hit++;ac.set(x,n-1);}}
 return (aa.length+bb.length)?2*hit/(aa.length+bb.length):0;
}
const ua='ApartmentMapResearch/1.0 (+https://github.com/shinstory1234-hub/-honbab-map; public pages only)';
async function get(url,attempt=0){
 try{
  const r=await fetch(url,{headers:{'User-Agent':ua,'Accept':'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(30000)});
  if((r.status===429||r.status>=500)&&attempt<2){await new Promise(z=>setTimeout(z,1200*(attempt+1)));return get(url,attempt+1);}
  return {status:r.status,html:await r.text()};
 }catch(e){if(attempt<2){await new Promise(z=>setTimeout(z,1000*(attempt+1)));return get(url,attempt+1);}return {status:0,error:String(e),html:''};}
}
async function pool(items,limit,fn){
 const out=new Array(items.length);let next=0;const w=Array.from({length:limit},async()=>{while(next<items.length){const i=next++;try{out[i]=await fn(items[i],i)}catch(e){out[i]={error:String(e)};}await new Promise(z=>setTimeout(z,85));}});
 await Promise.all(w);return out;
}
const rg=[...new Map(ranks.map(x=>[region(x.area).join('|'),region(x.area)])).values()];
const rx=/"@type":"ListItem","position":(\d+),"name":"([^"]+)","url":"https:\/\/m\.richgo\.ai\/realty\/danji\/([A-Za-z0-9]+)"/g;
const filters=['','20억이상','10억-20억','대단지','30평대','40평대이상','20평대','주차여유','역세권','신축'];
const tasks=rg.flatMap(([city,gu])=>filters.map(filter=>({city,gu,filter,url:'https://m.richgo.ai/realty/apt-hub/'+encodeURIComponent(city)+'/'+encodeURIComponent(gu)+(filter?'/'+encodeURIComponent(filter):'')})));
console.log('Researching '+ranks.length+' ranked complexes across '+rg.length+' districts and '+tasks.length+' bounded listing pages.');
const hubs=await pool(tasks,5,async t=>{const r=await get(t.url);return {...t,status:r.status,error:r.error||'',entries:[...r.html.matchAll(rx)].map(m=>({id:m[3],name:m[2]}))};});
const catalogs=new Map();for(const h of hubs){const id=h.city+'|'+h.gu;if(!catalogs.has(id))catalogs.set(id,new Map());for(const x of h.entries)catalogs.get(id).set(x.id,x);}
const lookups=ranks.map(d=>{const reg=region(d.area).join('|');let candidates=[...(catalogs.get(reg)||new Map()).values()].map(x=>({...x,sim:similarity(d.name,x.name)})).filter(x=>x.sim>.48).sort((a,b)=>b.sim-a.sim);
 const best=candidates[0]?.sim||0;let chosen=candidates.filter(x=>x.sim>=Math.max(.56,best-.13)).slice(0,5);
 return {...d,region:reg,candidates:chosen,candidateCount:candidates.length};});
const idList=[...new Set(lookups.flatMap(x=>x.candidates.map(y=>y.id)))];
console.log('Matched candidate names '+lookups.filter(x=>x.candidates.length>0).length+'/'+ranks.length+', reading '+idList.length+' unique detail pages.');
const esc=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
const factsResult=await pool(idList,5,async id=>{
 const url='https://m.richgo.ai/realty/danji/'+id;const r=await get(url);
 if(r.status!==200)return {id,url,status:r.status,error:r.error||'HTTP '+r.status};
 const tag=r.html.match(/<h2>([^<]*)(?:<!-- -->)? 단지 정보<\/h2><dl class="facts">([\s\S]*?)<\/dl>/);
 if(!tag)return {id,url,status:r.status,error:'facts section missing'};
 const found={};for(const m of tag[2].matchAll(/<dt>([^<]+)<\/dt><dd>([\s\S]*?)<\/dd>/g))found[esc(m[1])]=esc(m[2]);
 const title=esc(r.html.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
 return {id,url,status:r.status,name:esc(tag[1]),title,year:+(found['입주']||'').slice(0,4)||null,units:Number((found['세대수']||'').replace(/[^0-9]/g,''))||null,
 far:found['용적률']?Number(found['용적률'].replace(/[^0-9.]/g,''))||null:null,
 coverage:found['건폐율']||'',floors:found['층수']||'',parking:found['주차']||'',heating:found['난방']||'',builder:found['시공사']||'',sizes:found['평형']||''};
});
const details=new Map(factsResult.map(x=>[x.id,x]));
const files=['apt-unitfix.js','apt-fard.js','apt-univ10.js','apt-univ15.js','apt-univ20.js','apt-univ30.js','apt-univadd.js','apt-farfix.js','apt-far-normalize.js'];
const c={CAPT:25,PICKS:[],FARD:{},PLAT:{},UGEO:{},HAK:{},console};c.window=c;vm.createContext(c);
for(const f of files)vm.runInContext(fs.readFileSync('public/'+f,'utf8'),c,{filename:f});
const byName=new Map();for(const d of c.PICKS){const k=d.n+'|'+d.area;if(!byName.has(k))byName.set(k,d);}
const audited=lookups.map(x=>{
 const areaDong=x.area.split(' ').at(-1),tgt=norm(x.name),p=byName.get(x.key),oldF=c.FARD[x.key]||[];
 const alternatives=x.candidates.map(z=>{const d=details.get(z.id)||{};const dongOk=d.title?.includes(areaDong)||false;
   const yearDiff=d.year===null?99:Math.abs(d.year-x.year);
   const nameSim=similarity(x.name,d.name||z.name);
   const unitsRatio=d.units&&x.units?Math.min(d.units,x.units)/Math.max(d.units,x.units):0;
   const confidence=(dongOk?2:0)+(yearDiff<=2?2:yearDiff<=5?1:0)+(nameSim>=.88?3:nameSim>=.75?2:nameSim>=.56?1:0)+(unitsRatio>=.95?2:unitsRatio>=.5?1:0);
   return {...d,conf:confidence,dongOk,yearDiff,nameSim,unitsRatio};}).sort((a,b)=>b.conf-a.conf||b.nameSim-a.nameSim);
 const best=alternatives[0];const second=alternatives[1];const safe=best&&best.status===200&&best.dongOk&&best.nameSim>=.56&&best.yearDiff<=5&&(best.conf>=5)&&(!second||best.conf>=second.conf+1||best.nameSim>second.nameSim+.12);
 const status=safe?'직접대조':best?'매칭불확실':'리치고미매칭';
 const source=safe?best:{};
 return {rank:x.rank,name:x.name,area:x.area,py:x.py,price:x.price,score:x.score,mapYear:x.year,mapUnits:x.units,mapFar:oldF[0]??null,mapFarSource:oldF[1]||'',mapYearRaw:p?.year??null,mapUnitsRaw:p?.units??null,status,richgoName:source.name||best?.name||'',richgoId:source.id||best?.id||'',richgoUrl:source.url||best?.url||'',richgoYear:source.year??null,richgoUnits:source.units??null,richgoFar:source.far??null,richgoCoverage:source.coverage||'',richgoFloors:source.floors||'',richgoHeating:source.heating||'',richgoParking:source.parking||'',richgoBuilder:source.builder||'',richgoSizes:source.sizes||'',nameSimilarity:best?.nameSim??0,dongMatched:best?.dongOk??false,confidence:best?.conf??0,alternatives:alternatives.slice(0,3).map(z=>({id:z.id,name:z.name,conf:z.conf,url:z.url})),error:best?.error||'',mapFound:!!p};
});
const headers=['rank','name','area','py','price','mapYear','mapUnits','mapFar','mapFarSource','status','richgoName','richgoId','richgoYear','richgoUnits','richgoFar','richgoCoverage','richgoFloors','richgoHeating','richgoParking','richgoBuilder','richgoSizes','richgoUrl','confidence','error'];
const csv=v=>{const z=String(v??'');return /[,"\r\n]/.test(z)?'"'+z.replace(/"/g,'""')+'"':z};
fs.writeFileSync('docs/richgo-20to25-top300-audit-20261118.csv',[headers,...audited.map(x=>headers.map(h=>x[h]))].map(row=>row.map(csv).join(',')).join('\n')+'\n');
fs.writeFileSync('docs/richgo-20to25-top300-audit-20261118.json',JSON.stringify({source:'Richgo public complex pages',sourceRanking:'2026-11-14 exported 300 unique ranked complexes',audited},null,2)+'\n');
const verified=audited.filter(x=>x.status==='직접대조'),stats={total:audited.length,verified:verified.length,ambiguous:audited.filter(x=>x.status==='매칭불확실').length,unmatched:audited.filter(x=>x.status==='리치고미매칭').length,
 farKnown:verified.filter(x=>x.richgoFar!==null).length,farChanged:verified.filter(x=>x.richgoFar!==null&&x.richgoFar!==x.mapFar).length,
 unitsChanged:verified.filter(x=>x.richgoUnits!==null&&x.richgoUnits!==x.mapUnits).length,
 yearChanged:verified.filter(x=>x.richgoYear!==null&&x.richgoYear!==x.mapYear).length,
 hubsAttempted:hubs.length,hubsFailed:hubs.filter(x=>x.status!==200).length,detailsFetched:idList.length,detailErrors:factsResult.filter(x=>x.status!==200||x.error).length,
 pending:audited.filter(x=>x.status!=='직접대조').map(x=>({rank:x.rank,name:x.name,area:x.area,alternatives:x.alternatives}))};
fs.writeFileSync('docs/richgo-cap25-lookup-diagnostics.json',JSON.stringify(stats,null,2)+'\n');
console.log('BATCH SUMMARY '+JSON.stringify({...stats,pending:stats.pending.slice(0,30)},null,2));
