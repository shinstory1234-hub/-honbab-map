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

/* 2차 공식 원본 대사: 건축HUB 재확인 82곳(총괄표제부 10, 동별 용적률 합의 72).
   전체 매칭 키 목록·판정 근거는 docs/apt-far-pass2-evidence-2026-11-16.md 참조.
   7자리 해시 + 4자리 백분율(×100)의 고정 길이 인코딩. 첫 1차 값이 이미 실측이면 변경하지 않음. */
(function(W){
 if(!(W.CAPT>6))return;
 const h=k=>{let z=5381;for(let i=0;i<k.length;i++)z=((z*33)^k.charCodeAt(i))>>>0;return z.toString(36).padStart(7,'0');};
 const p='0gm5rfx0l9i012o73s0lbc1cyh21q0lbc1o5fo8h0q86046igf00j8c0wuebla0q2h1vyhmbs0mcp0du3px30f9y1aw88w60hrs0i7i8380h3q1jsiq3l0gay0ohfepx0gay0bui9dp0kf11uvg04w0jab0bxcohx0ie60ma8tvw0kei1gpp6g10hmu18nllft0hmu0odfnvg0jsm10d324c0a5n08kbwbc0egk0f8a1no0fwg0j8ycoh0g1s1csx77s0hc4029xtrg0gx9060iwob0h181encci00h1m0x53pww0gyy11f4p8w0h0m09uam080ngw0qv9ffw0ojg18t1ftl0gmb0kf0y4a0gmb181d2xy0gmb00d9z4o0haw1kzp3eo0krj0wrpct90gyx1lbctq40gxv0ar89ww0kxd0kt89sl0kz21n33v1i0hz40160auu0ga0101bpnl0d4u1rwgmq00fyr0udna8o0e720sgii580e721jrrfl50e7g1fm1sz30b4h0hyr5uz0gfm1dtedso0cic06cyd1x0cb90czrw2g0cb90kg43rg0cb905vtke90dgz0if5xds0cb914yq5h50cp21cae1220fhh1hd9duc0gf61n5wsq00e711gsyn7s0f5l1mq58d50e4a0u9zzpl0e4a0ta6awj0e420i5v5020gpo0gz8uto0n591uawjfw0jnm1dtiu2m0gcv0ete1bc0gcr1btu2ck0fqp06fyb510eqg1v7loeq0byf13acx0k0j591d3stfm0gjf1ss3ub20gce01cyjx40gce1qnoxas0cjg106rjwp0fmv09eg4yq0h980gfealg0gjf08pylpg0dgo0jbvauj0ds40jv5jp00j77',m=new Map();
 for(let i=0;i<p.length;i+=11)m.set(p.slice(i,i+7),parseInt(p.slice(i+7,i+11),36)/100);
 let count=0;
 for(const k in W.FARD){
  const f=W.FARD[k];if(!f||(Number(f[0])>0&&!/^(E|T)/.test(String(f[1]||''))))continue;
  const v=m.get(h(k));if(v==null)continue;f[0]=v;f[1]='L';count++;
 }
 W.APT_FAR_PASS2_N=count;
})(window);
