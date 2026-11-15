/* 2026.11.16 6억 초과 용적률 원자료 복원: 건축물대장 CXP 좌표 30m 이내 + 세대수 완전일치 + 단일 용적률인 경우만 채택. */
(function(W){
 if(!(W.CAPT>6)||!Array.isArray(W.CXP))return;
 const cells=new Map(),cell=(a,b)=>Math.floor(a*1000)+'|'+Math.floor(b*1000);
 for(const p of W.CXP){if(!(p&&p[2]>0&&p[4]>=100&&p[4]<=1800))continue;const k=cell(p[0],p[1]);let list=cells.get(k);if(!list)cells.set(k,list=[]);list.push(p);}
 const matched=Object.create(null),bad=new Set();
 for(const d of W.PICKS||[]){
  const k=d.n+'|'+d.area,lat=d.lat,lng=d.lng;
  if(bad.has(k)||!Number.isFinite(lat)||!Number.isFinite(lng)||!(d.units>0))continue;
  const x=Math.floor(lat*1000),y=Math.floor(lng*1000),c=Math.cos(lat*Math.PI/180);
  let v=null,conflict=false;
  for(let i=x-1;i<=x+1;i++)for(let j=y-1;j<=y+1;j++)for(const p of cells.get(i+'|'+j)||[]){
   if(p[2]!==d.units||Math.hypot((p[0]-lat)*111000,(p[1]-lng)*111000*c)>30)continue;
   const a=[p[4],p[3]===1?1:0];
   if(v&&(v[0]!==a[0]||v[1]!==a[1]))conflict=true;
   v=a;
  }
  if(!v||conflict)continue;
  if(matched[k]&&(matched[k][0]!==v[0]||matched[k][1]!==v[1])){delete matched[k];bad.add(k);}
  else matched[k]=v;
 }
 const verified=Object.create(null),audit={matched:0,filled:0,replacedEstimate:0,conflicts:0};
 for(const [k,v] of Object.entries(matched)){
  const f=(W.FARD||{})[k];if(!f)continue;
  const old=Number(f[0]),src=String(f[1]||''),estimated=/^E|^T$/.test(src);
  if(old>0&&!estimated&&Math.abs(old-v[0])>5){audit.conflicts++;continue;}
  verified[k]=v;audit.matched++;
  if(!(old>0)||estimated){if(old>0)audit.replacedEstimate++;else audit.filled++;f[0]=v[0];f[1]='L';}
 }
 W.APT_CXP_MATCH=verified;W.APT_FAR_AUDIT=audit;
})(window);
