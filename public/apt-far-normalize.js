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

/* 3차 공개 단지정보 교차대조(2026-11-16):
   KB부동산 51곳 + 리치고 120곳. 기존 건축물대장 실측(L/F)을 덮어쓰지 않는다.
   대상·원문 URL·세대수 대조 근거: docs/apt-far-kb-crosscheck-51-2026-11-16.csv,
   docs/apt-far-richgo-252-compact-2026-11-16.csv.
   키 7자리 해시 + 용적률(%) 3자리 36진수 + 출처(K/R) 인코딩. */
(function(W){
 if(!(W.CAPT>6)||!W.FARD)return;
 const h=k=>{let z=5381;for(let i=0;i<k.length;i++)z=((z*33)^k.charCodeAt(i))>>>0;return z.toString(36).padStart(7,'0');};
 const packed='182dv8q05kK00x37kl06vK1ymip8v04zK07i6mvx041K00wyok0060K18zgn0x04cK0j516yg03tK07ndm6z03tK0vo25dm03tK1ybs75l04uK1an4tkg054K0jzp0l9066K0t1jbt004zK125clrp038K1mvgl6d05uK14sqb9g06nK1tg4b0o06cK0jp1rbh06xK14v9ywd063K12fom4s079K02ge0bo06oK06lnkbu077K1y6waer03eK067k51003gK1w1pgja03vK0opy2lz03hK1e9c2ht06lK1knjegp06rK0odgslw04zK0uz481u05jK1jthpvp0a6K01fo9vt06wK1sg9zks06xK1w3q59l06wK0tdk27x06xK0y6ql0g0e6K0h295ht058K0msk8hl05uK12ccm3g07oK0uq1joh05fK1az3g6l065K1p9evr905hK13x0bj50cbK01mzkl105wK14osbmn059K1tixqy002lK09fcip9062K16afpzo063K0if477l07oK1gisafi06sK1pls0cs06cK1uzkr1n04dR007j6m707eR0kzt0yk04yR1kixio006aR1kgy5hx04dR1viwfj904zR1vqu7ce067R13ii30g05iR02i4z28050R0tttos8077R1upirob040R0spcp68056R0cfytw104bR1lrsbch0auR02vv44j05sR1nlx1ch05tR1bb5izh06cR04auleu06xR0b70vxm04yR027y4b504yR1a8ustc04dR17v6xfj050R01obu0u04tR1pm772606iR0m1rt1o06cR142mgmo05qR0vl6hl805gR1drapnp08xR0fznhjn068R0pqyimt05qR1tugta509iR0tcp78d06oR1qy11es06mR00misww07bR0o7bko104eR1qmmbnc05tR1jsa96806iR0ek8e3405sR0sw3ird05xR12y31ig09tR069wdx5051R1yzy1mk04wR01z7zlz03nR1sh5gxp060R1kqtcyu067R08ie2cw049R03qcfnl04pR03yjpoe04wR1c8vba806iR1yzlcll06iR1cntnzd06gR06ysuan054R03gtlc005pR14m7mos06zR0f71sh4050R01i4f1106gR1s8c68j04cR1688tmi06uR13kseqw06vR0i6hgsl03nR01iyro903nR14ai5eh05uR1lia6lg03cR0l0btb506cR0tvpk29069R1icdryl054R06alii005yR0gs0gdw07aR0dx5ph5052R0hofq4d077R0uwraf1073R1s7vbpk05mR170igya06qR0vos2op06dR1bpzc9l03sR1lfwq2406iR0lwvqqo04dR1mj2ump084R0atw22g03oR0nyk0do04sR1lv0jl103pR0dtb6do05jR1ynpxko061R0al343x02qR1joa9ld047R1ivx714056R14d583n06fR0y4rvya06xR174tl9106zR0vzafk404cR0ycdrj007hR1w42xjg07qR0rodcps06nR1el7mw207kR1osfdo505oR1py3ebn06iR042s7ls05cR1ppddw8061R1arzev004kR1yv9p8t05hR0oaslz508pR15j4ekc06yR0kyp63408iR1umnl1w05rR1irn1o7072R1wmrrro058R1ya0xws04nR09uy0aw06qR1o43mes06nR0cvey9t03wR0kr93hh06fR0ds60fd06fR001t61k04fR0w77fth058R0cgrisk05bR161ckph037R1gsev5806jR0y0pso1053R06oib7305nR12ailc80adR',m=new Map();
 for(let i=0;i<packed.length;i+=11){const v=packed.slice(i+7,i+10);m.set(packed.slice(i,i+7),[parseInt(v,36),packed[i+10]==='K'?'KB부동산':'리치고']);}
 let count=0;
 for(const k in W.FARD){const f=W.FARD[k];if(!f||Number(f[0])>0&&!/^(E|T)/.test(String(f[1]||'')))continue;
  const v=m.get(h(k));if(!v)continue;f[0]=v[0];f[1]=v[1];count++;
 }
 W.APT_FAR_WEB_N=count;
})(window);
