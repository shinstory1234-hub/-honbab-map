'use strict';
/* Independently recheck the 51 unresolved cap15 entries; protect split complexes. */
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const pathOf=p=>path.join(root,p),csvFile='docs/richgo-10to15-remaining814-20261118.csv',specFile='docs/richgo-10to15-verified-corrections.json';
function csv(s){let table=[],row=[],v='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++}else if(c==='"')q=false;else v+=c;}else if(c==='\n'){row.push(v.replace(/\r$/,''));table.push(row);row=[];v=''}else if(c===','){row.push(v);v=''}else v+=c;}const header=table.shift();return {header,rows:table.filter(r=>r.length===header.length).map(r=>Object.fromEntries(header.map((k,j)=>[k,r[j]])))};}
const esc=x=>{x=String(x??'');return /[",\n\r]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x};
const num=x=>{if(x==null||String(x).trim()==='')return null;const v=Number(String(x).replaceAll(',','').replace(/[^\d.-]/g,''));return Number.isFinite(v)?v:null;};
const clean=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&#x([0-9a-f]+);/ig,(_,x)=>String.fromCodePoint(parseInt(x,16))).replace(/&#(\d+);/g,(_,x)=>String.fromCodePoint(+x)).replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const norm=x=>String(x||'').toLowerCase().replace(/[^가-힣a-z0-9]/g,'');
const aliasSeq=new Set([369,385,390,391,415,432,472,474,477,507,509,544,546,557,613,645,737,824,873,915]);
const idOverride={544:'a7JHFyX',546:'a7ZKaci'};
const agent='Mozilla/5.0 (compatible; AptMapDataAudit/1.0; +https://github.com/shinstory1234-hub/-honbab-map)';
async function fetchText(id){const url='https://m.richgo.ai/realty/danji/'+id;for(let i=0;i<3;i++){try{const r=await fetch(url,{headers:{'user-agent':agent},signal:AbortSignal.timeout(22000)});if(r.ok)return await r.text();if([403,429].includes(r.status))throw Error('RESTRICTED '+r.status)}catch(e){if(i===2)throw e}await new Promise(res=>setTimeout(res,300+i*300));}throw Error('FAILED '+url);}
function facts(html,id){const p=html.indexOf('<dl class="facts">');if(p<0)throw Error('Richgo detail facts missing for '+id);const f={};for(const m of html.slice(p+18,html.indexOf('</dl>',p)).matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))f[clean(m[1])]=clean(m[2]);
 const h=html.slice(Math.max(0,p-500),p),names=[...h.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)],name=clean(names.at(-1)?.[1]||'').replace(/단지 정보$/,'').trim();
 const title=clean(html.match(/<title>([\s\S]*?)<\/title>/)?.[1]||'');
 const year=Number((f['입주']||'').match(/(?:19|20)\d{2}/)?.[0]||0),units=num(f['세대수']),far=num(f['용적률']);
 if(!year||!units||!name)throw Error('Detail fact invalid '+id);
 return {name,title,year,units,far,floors:f['층수']||'',coverage:num(f['건폐율']),parking:num((f['주차']||'').split('대')[0]),heating:f['난방']||'',builder:f['시공사']||'',pyeongs:f['평형']||'',id,url:'https://m.richgo.ai/realty/danji/'+id};
}
async function main(){
 const {header,rows}=csv(fs.readFileSync(pathOf(csvFile),'utf8')),spec=JSON.parse(fs.readFileSync(pathOf(specFile),'utf8'));if(rows.length!==814)throw Error('Not 814 rows');
 const todo=rows.filter(r=>r.verification!=='직접확인');if(todo.length!==51)throw Error('Expected 51 unmatched, received '+todo.length);
 const entries=todo.map(r=>({row:r,id:idOverride[Number(r.seq)]||(r.notes.match(/a[A-Za-z0-9]{6}/g)||[]).at(-1)||''}));
 const ids=[...new Set(entries.map(e=>e.id).filter(x=>/^a[A-Za-z0-9]{6}$/.test(x)))],memo=new Map;let n=0;
 await Promise.all(Array.from({length:7},async()=>{while(n<ids.length){const id=ids[n++];memo.set(id,facts(await fetchText(id),id))}}));
 const review=[];
 for(const {row,id} of entries){
   const fact=memo.get(id),seq=Number(row.seq),dong=row.area.split(' ').at(-1),key=row.name+'|'+row.area,notes=[];
   if(!fact||!fact.title.includes(dong)){
    row.verification='리치고단지미확인';row.action='원본유지';row.notes+=' | 2차 확인: 리치고 동일 법정동 단지를 찾지 못함';
    review.push({seq,name:row.name,status:row.verification,reason:'no same-dong verified detail'});continue;
   }
   const originalUnits=num(row.map_units)||0,ratio=Math.max(fact.units/originalUnits,originalUnits/fact.units);
   const yearMatch=Number(row.map_year)===fact.year;
   const mustHave=seq===544?'관음':seq===546?'한마음':'';
   const validAlias=aliasSeq.has(seq)&&yearMatch&&(ratio<=1.30||(seq===415&&fact.units===1764))&&(!mustHave||norm(fact.name).includes(mustHave));
   if(validAlias){
    Object.assign(row,{verification:'직접확인',action:'변경',richgo_name:fact.name,richgo_id:fact.id,richgo_year:String(fact.year),richgo_units:String(fact.units),richgo_far:fact.far==null?'':String(fact.far),richgo_floors:fact.floors,richgo_coverage:fact.coverage==null?'':String(fact.coverage),richgo_parking:fact.parking==null?'':String(fact.parking),richgo_heating:fact.heating,richgo_builder:fact.builder,richgo_pyeongs:fact.pyeongs,source_url:fact.url,evidence:'리치고 공개 단지정보 + 법정동·준공연도·별칭 재검증',audit_discovery:'manual_alias_confirmed'});
    const change=[];for(const field of ['year','units','far'])if(fact[field]!=null&&Number(row['map_'+field]||0)!==fact[field]){
     if(field==='far'&&!(fact.far>=50&&fact.far<=1500))continue;
     spec[field][key]=fact[field];change.push(field);
    }
    row.action=change.length?'변경':'동일';row.notes+=' | 2차 직접검증: '+fact.name+'('+fact.units+'세대), 수정 '+(change.join(', ')||'없음')+' '+fact.url;
    review.push({seq,name:row.name,status:'직접확인',source:fact.url,changes:change,yearMatch,ratio});continue;
   }
   const sameCore=(norm(row.name).includes(norm(fact.name))||norm(fact.name).includes(norm(row.name))||row.name.replace(/[\d()·A-Za-z\s-]/g,'').length>3&&fact.name.includes(row.name.replace(/[\d()·A-Za-z\s-]/g,'')));
   if(sameCore&&yearMatch){
    row.verification='집계단위불일치';row.action='집계단위확인';
    Object.assign(row,{richgo_name:fact.name,richgo_id:fact.id,richgo_year:String(fact.year),richgo_units:String(fact.units),richgo_far:fact.far==null?'':String(fact.far),richgo_floors:fact.floors,richgo_coverage:fact.coverage==null?'':String(fact.coverage),richgo_parking:fact.parking==null?'':String(fact.parking),richgo_heating:fact.heating,richgo_builder:fact.builder,richgo_pyeongs:fact.pyeongs,source_url:fact.url,audit_discovery:'public_candidate_aggregate_not_same_unit'});
    row.notes+=' | 리치고 통합/분할 집계: '+fact.name+' '+fact.units+'세대, 아파트맵 '+originalUnits+'세대, 값을 무단 덮어쓰지 않음. '+fact.url;
   }else{
    row.verification='리치고후보불일치';row.action='원본유지';row.audit_discovery='different_public_candidate';
    row.notes+=' | 2차 공개 후보 '+fact.name+' '+fact.units+'세대는 동·명칭·범위 중 불일치. 원자료 유지 '+fact.url;
   }
   review.push({seq,name:row.name,status:row.verification,candidate:fact.url,siteName:fact.name,siteUnits:fact.units,origUnits:originalUnits,yearMatch});
 }
 for(const field of ['far','units','year'])for(const [key,value] of Object.entries(spec[field]||{})){
  const x=rows.find(y=>y.name+'|'+y.area===key);
  if(x&&x.verification!=='직접확인')throw Error('Unsafe correction after alias review '+field+' '+key);
 }
 fs.writeFileSync(pathOf(csvFile),header.join(',')+'\n'+rows.map(x=>header.map(k=>esc(x[k])).join(',')).join('\n')+'\n');
 fs.writeFileSync(pathOf(specFile),JSON.stringify(spec,null,2)+'\n');
 const counts={checked:rows.length,direct:rows.filter(x=>x.verification==='직접확인').length,exceptions:rows.filter(x=>x.verification==='집계단위불일치').length,unidentified:rows.filter(x=>x.verification==='리치고후보불일치'||x.verification==='리치고단지미확인').length,fromSecondPass:review.filter(x=>x.status==='직접확인').length,far:Object.keys(spec.far).length,year:Object.keys(spec.year).length,units:Object.keys(spec.units).length};
 fs.writeFileSync(pathOf('docs/richgo-10to15-remaining814-secondary-evidence.json'),JSON.stringify({counts,review},null,2)+'\n');
 console.log('SECOND_PASS_814',JSON.stringify(counts));
}
main().catch(e=>{console.error(e);process.exitCode=1});
