/* Build exact complement of previously audited top300 from the 1,114 packed cap15 complexes. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=read('public/apt-univ15.js');
const si=data.indexOf('const A=['),se=data.indexOf('],',si),ri=data.indexOf(',R=['),re=data.indexOf('];\nconst TB=',ri);
if(si<0||se<0||ri<0||re<0)throw Error('cap15 packed source layout changed');
const areas=JSON.parse(data.slice(si+8,se+1)),raw=JSON.parse(data.slice(ri+3,re+1));
const top300text=read('docs/richgo-10to15-top300-20261118.csv');
function parse(s){let out=[],r=[],v='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++}else if(c==='"')q=false;else v+=c;}else if(c==='"')q=true;else if(c===','){r.push(v);v='';}else if(c==='\n'){r.push(v.replace(/\r$/,''));out.push(r);r=[];v='';}else v+=c}const keys=out.shift();return out.filter(x=>x.length===keys.length).map(x=>Object.fromEntries(keys.map((k,j)=>[k,x[j]])));}
const top300=parse(top300text),done=new Set(top300.map(x=>x.name+'|'+x.area));if(top300.length!==300||done.size!==300)throw Error('top300 inventory changed');
const snap=JSON.parse(read('public/apt-snap15-2026-11-03-m2.json')),rank=new Map;
for(const x of snap.rows){const key=x[1]+'|'+x[2];if(!rank.has(key))rank.set(key,x[0]);}
if(raw.length!==1114||new Set(raw.map(x=>x[0]+'|'+areas[x[1]])).size!==1114)throw Error('unexpected cap15 count');
const uniq=new Set,header=top300text.slice(0,top300text.indexOf('\n')).split(','),rows=[];
for(const r of raw){
 const name=r[0],area=areas[r[1]],key=name+'|'+area;
 if(done.has(key))continue;
 if(uniq.has(key))throw Error('duplicate cap15 '+key);uniq.add(key);
 const f=r[22]||[],obj={
 seq:String(rows.length+301),snapshot_rank:String(rank.get(key)||''),name,area,py:String(r[2]||''),price_manwon:String(r[3]||''),
 map_year:String(r[4]||''),map_units:String(r[5]||''),map_far:f[0]==null?'':String(f[0]),map_far_source:String(f[1]||''),
 verification:'미조사',action:'미조사',notes:'2026-11-18 리치고 미대조, 원본 값 보존'
 };
 rows.push(obj);
}
if(rows.length!==814||new Set(rows.map(x=>x.name+'|'+x.area)).size!==814)throw Error('Expected complement 814, got '+rows.length);
for(const x of rows)for(const k of Object.keys(x))if(!header.includes(k))throw Error('Unknown CSV column '+k);
const esc=v=>{v=String(v??'');return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const dest=path.join(root,'docs/richgo-10to15-remaining814-20261118.csv');
fs.writeFileSync(dest,header.join(',')+'\n'+rows.map(x=>header.map(k=>esc(x[k])).join(',')).join('\n')+'\n');
console.log('CAP15_COMPLEMENT',JSON.stringify({all:raw.length,top300:top300.length,remaining:rows.length,inSnapshot:rows.filter(x=>x.snapshot_rank).length,outsideSnapshot:rows.filter(x=>!x.snapshot_rank).length,destination:dest}));
