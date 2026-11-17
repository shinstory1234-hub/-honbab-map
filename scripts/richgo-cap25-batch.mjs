import fs from 'node:fs';
const input=fs.readFileSync('docs/richgo-20to25-top300-20261114-snapshot.csv','utf8').trim().split('\n');
function parseRow(line){let out=[],cell='',quoted=false;for(let i=0;i<line.length;i++){const x=line[i];if(quoted){if(x==='"'&&line[i+1]==='"'){cell+='"';i++}else if(x==='"')quoted=false;else cell+=x;}else if(x==='"')quoted=true;else if(x===','){out.push(cell);cell='';}else cell+=x;}out.push(cell.trim().replace(/\r$/,''));return out;}
const ranks=input.slice(1).map(parseRow).map(r=>({rank:+r[1],name:r[2],area:r[3],units:+r[8],year:+r[7]}));
function region(area){const p=area.split(' ');if(p[0]==='서울')return ['서울',p[1]];const m={'성남':'성남시','수원':'수원시','화성':'화성시','용인':'용인시'};return ['경기',m[p[0]]?m[p[0]]+' '+p[1]:p[0]];}
const uniq=[...new Map(ranks.map(x=>[region(x.area).join('|'),region(x.area)])).values()];
async function get(url){const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; ApartmentMapResearch/1.0)'},signal:AbortSignal.timeout(25000)});const s=await r.text();return {status:r.status,html:s};}
const rx=/"@type":"ListItem","position":(\d+),"name":"([^"]+)","url":"https:\/\/m\.richgo\.ai\/realty\/danji\/([A-Za-z0-9]+)"/g;
const regions=await Promise.all(uniq.map(async ([city,gu])=>{const url='https://m.richgo.ai/realty/apt-hub/'+encodeURIComponent(city)+'/'+encodeURIComponent(gu);
try{const {status,html}=await get(url);let entries=[...html.matchAll(rx)].map(m=>({pos:+m[1],name:m[2],id:m[3]}));return {city,gu,url,status,entries:entries.filter((x,i)=>entries.findIndex(y=>y.id===x.id)===i),length:html.length};}catch(e){return {city,gu,url,error:String(e),entries:[]};}}));
const normalize=s=>s.normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'').replace(/아파트/g,'').toLowerCase();
const result=ranks.map(d=>{let [c,g]=region(d.area),zone=regions.find(x=>x.city===c&&x.gu===g);let n=normalize(d.name),candidates=(zone?.entries||[]).map(q=>{let m=normalize(q.name);return {...q,method:m===n?'exact':(m.length>3&&(n.includes(m)||m.includes(n)))?'contains':'none',score:m===n?1:(m.length>3&&(n.includes(m)||m.includes(n)))?Math.min(m.length,n.length)/Math.max(m.length,n.length):0};}).filter(x=>x.method!=='none').sort((a,b)=>b.score-a.score);return {...d,region:c+'|'+g,candidates:candidates.slice(0,4)};});
const pages={};for(let id of ['a6KvZvL','a2kgiJu','a1Ucmro']){try{let {status,html}=await get('https://m.richgo.ai/realty/danji/'+id);let snippets={};for(let k of ['용적률','건폐율','세대수','주차대수','입주','층수','지역난방']){let i=html.indexOf(k);snippets[k]=i<0?'':html.slice(Math.max(0,i-270),i+370);}pages[id]={status,len:html.length,snippets,title:html.match(/<title>(.*?)<\/title>/)?.[1]};}catch(e){pages[id]={error:String(e)};}}
const paths=[
 'https://m.richgo.ai/realty/apt-hub/'+encodeURIComponent('서울')+'/'+encodeURIComponent('마포구')+'?page=2',
 'https://m.richgo.ai/realty/apt-hub/'+encodeURIComponent('서울')+'/'+encodeURIComponent('마포구')+'?limit=200',
 'https://m.richgo.ai/realty/apt-hub/'+encodeURIComponent('서울')+'/'+encodeURIComponent('마포구')+'/'+encodeURIComponent('20억이상'),
 'https://m.richgo.ai/realty/apt-hub/'+encodeURIComponent('서울')+'/'+encodeURIComponent('마포구')+'/'+encodeURIComponent('30평대'),
 'https://m.richgo.ai/realty/apt-hub/'+encodeURIComponent('경기')+'/'+encodeURIComponent('성남시 분당구')+'/'+encodeURIComponent('재건축'),
 'https://m.richgo.ai/realty/apt-hub/'+encodeURIComponent('경기')+'/'+encodeURIComponent('성남시 분당구')+'/'+encodeURIComponent('대단지')
];
const extras=await Promise.all(paths.map(async url=>{try{const {html,status}=await get(url);const a=[...html.matchAll(rx)].map(m=>({name:m[2],id:m[3]}));return {url,status,count:a.length,first:a.slice(0,12),last:a.slice(-5),len:html.length};}catch(e){return{url,error:String(e)};}}));
const out={extras,asof:'2026-11-18',groups:regions.map(x=>({...x,entries:x.entries.slice(0,5)})),groupCounts:regions.map(x=>[x.city+' '+x.gu,x.entries.length,x.status,x.error]),exact:result.filter(x=>x.candidates.some(c=>c.method==='exact')).length,approx:result.filter(x=>x.candidates.length).length,unmatched:result.filter(x=>!x.candidates.length).map(({rank,name,area})=>({rank,name,area})),matches:result.map(x=>({rank:x.rank,name:x.name,area:x.area,units:x.units,year:x.year,candidates:x.candidates})),pages};
fs.writeFileSync('docs/richgo-cap25-lookup-diagnostics.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({groups:out.groupCounts,exact:out.exact,approx:out.approx,unmatched:out.unmatched.length,unmatchedTop:out.unmatched.slice(0,35),pages:Object.fromEntries(Object.entries(pages).map(([k,v])=>[k,{status:v.status,len:v.len,snippets:Object.fromEntries(Object.entries(v.snippets||{}).map(([a,b])=>[a,b.slice(0,220)]))}]))},null,2));
