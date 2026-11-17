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

/* 3차 공개 단지정보 교차검증: KB부동산 51개, 리치고 120개.
   근거: docs/apt-far-kb-crosscheck-51-2026-11-16.csv, docs/apt-far-richgo-252-compact-2026-11-16.csv.
   4자리 충돌검증 해시 + 출처 1비트 포함 용적률(%) 3자리. 공식값(F/L) 유지. */
(function(W){
 if(!(W.CAPT>6)||!W.FARD)return;
 const h=k=>{let z=5381;for(let i=0;i<k.length;i++)z=((z*33)^k.charCodeAt(i))>>>0;return z.toString(36).slice(-4).padStart(4,'0');};
 const p='dv8q0b437kl0dqip8v09y6mvx082yok00c0gn0x08o16yg07mdm6z07m25dm07ms75l09o4tkg0a8p0l90ccjbt009yclrp06ggl6d0boqb9g0da4b0o0co1rbh0du9ywd0c6om4s0eie0bo0dcnkbu0eewaer06sk51006wpgja07qy2lz06yc2ht0d6jegp0digslw09y481u0b2hpvp0kco9vt0ds9zks0duq59l0dsk27x0duql0g0sc95ht0agk8hl0bocm3g0fc1joh0au3g6l0caevr90ay0bj50omzkl10bssbmn0aixqy0056cip90c4fpzo0c6477l0fcsafi0dks0cs0cokr1n08rj6m70ett0yk09xxio00cly5hx08rwfj909zu7ce0cfi30g0b14z280a1tos80efirob081cp680adytw108nsbch0lpv44j0blx1ch0bn5izh0cpuleu0dv0vxm09xy4b509xustc08r6xfj0a1bu0u09n77260d1rt1o0cpmgmo0bh6hl80axapnp0hvnhjn0chyimt0bhgta50j1p78d0dd11es0d9isww0enbko108tmbnc0bna9680d18e340bl3ird0bv31ig0jnwdx50a3y1mk09t7zlz07b5gxp0c1tcyu0cfe2cw08jcfnl09fjpoe09tvba80d1lcll0d1tnzd0cxsuan0a9tlc00bf7mos0dz1sh40a14f110cxc68j08p8tmi0dpseqw0drhgsl07byro907bi5eh0bpa6lg06pbtb50cppk290cjdryl0a9lii00bx0gdw0el5ph50a5fq4d0efraf10e7vbpk0b9igya0dhs2op0crzc9l07lwq240d1vqqo08r2ump0g9w22g07dk0do09l0jl107fb6do0b3pxko0c3343x05ha9ld08fx7140ad583n0cvrvya0dvtl910dzafk408pdrj00ez2xjg0fhdcps0db7mw20f5fdo50bd3ebn0d1s7ls0apddw80c3zev00959p8t0azslz50hf4ekc0dxp6340h1nl1w0bjn1o70e5rrro0ah0xws09by0aw0dh3mes0dbey9t07t93hh0cv60fd0cvt61k08v7fth0ahrisk0anckph06fev580d3pso10a7ib730bbilc80kr',m=new Map();
 for(let i=0;i<p.length;i+=7){const v=parseInt(p.slice(i+4,i+7),36);m.set(p.slice(i,i+4),[v>>1,v&1?'리치고':'KB부동산']);}
 let n=0;for(const k in W.FARD){const f=W.FARD[k];if(!f||Number(f[0])>0&&!/^(E|T)/.test(String(f[1]||'')))continue;
  const v=m.get(h(k));if(!v)continue;f[0]=v[0];f[1]=v[1];n++;
 }
 W.APT_FAR_WEB_N=n;
})(window);

/* 4차 리치고 우선 채택: 세대수 불일치 62, 동일성 불확실 20개 (공개 숫자 용적률 확인 후보).
   사용자 지시에 따라 단지 일치 검증을 유예하고 수치 우선 적용. 미확인 상태는 출처에 명시.
   원자료: docs/apt-far-richgo-252-compact-2026-11-16.csv.
   공식 L/F 및 3차 반영값 유지, 6억 이하(CAPT<=6) 절대 미적용.
   7자리 전체키 해시와 3자리 36진수 용적률을 10자 단위로 저장. */
(function(W){
 if(!(W.CAPT>6)||!W.FARD)return;
 const h=k=>{let z=5381;for(let i=0;i<k.length;i++)z=((z*33)^k.charCodeAt(i))>>>0;return z.toString(36).padStart(7,'0');};
 const p='1cc5c5406r0njosg505u0leqmsl03z06f5msh05e1mmnx6s04w0f307v605z1rtxuhl05z0xkwrjs05o0ep9jh90e61wwp1jj04l18tt6ux06801lkjrt0aq1vu0lxo05x1e97m8v0de15syde10531ogxhy407z1ezdcxp06s11ohkx804w0y6qeqa05y0cpt8ek05w1tj0dm705a0uklgow05b1jslg5505k05yfaxx0750e1e9vg0801lq0zkc04y0gcmucm04r1k8v1wc05g1qb6nz005s1ktb8hd05l02e5vr306w0qboorv04u1lp6e6x05u0nir4d905y0rd972w05b0a9qzik05m10qacx105m0ks00dt05y1ogzic305l02klqec06o1f34s0m04u0bfkezl06w0pa2t0407b11kzxet0581jdgcn905w1knpl38067013l0a105o1kozne004k1ko7fd405o1492in106b12j4qmw06t12b6wot07n137q37m05d0595arh05y08csfpx08q1v5vtmg03616n7wdh0520mkqvnh0380gpyhop0571of4zma05o04r7uj405o191ssef09110fhkss09h07j13l306r1llybx204t0w4iq9c0751ob3ims06g0s76v3i06q0e7eqn907508mzjlw0971p9lhhl05l09g4ygo06y0if61ls05y1o5uf7p0381w2ehn505b00t704105v10g1wey05f066ic2w07m0y30qdk079159c1bf06b0kq8bch05y0b3ppal051',m=new Map();
 for(let i=0;i<p.length;i+=10)m.set(p.slice(i,i+7),parseInt(p.slice(i+7,i+10),36));
 let n=0;for(const k in W.FARD){
  const f=W.FARD[k];if(!f||Number(f[0])>0&&!/^(E|T)/.test(String(f[1]||'')))continue;
  const v=m.get(h(k));if(v==null)continue;f[0]=v;f[1]='리치고(단지 일치 미검증)';n++;
 }
 W.APT_FAR_RICHGO_PREFERRED_N=n;
})(window);

/* Verified Richgo cap30-only overlay: 53 FAR, 7 unit, 4 year facts from 2026-11-18 public-source 273-case audit. No other band affected. */
(function(W){if(W.CAPT!==30||!W.FARD)return;
const h=k=>{let v=5381;for(let i=0;i<k.length;i++)v=((v*33)^k.charCodeAt(i))>>>0;return v.toString(36).padStart(7,'0')};
const f='0ufltkt07l0mohqr507v0o7j2oo06x15pat6808o1g18nw505l1h4w2u604f0hx5qil03f12ty67g06b0wnxooh03f01kcozd05b0cn66d909v1p9evr905h06ngx9x05b1s1lo9w05b0cfghbg0620yf3eos0680qj74kc05e15hdq6c06y188dgq90b21lw3l950m70966rvo04c1drt7ln05v18mbpmc08212ccm3g07p1m1ripi0610n23k590631oo75fy0ex1qb6nz005s0yol9ay06c08y22nt06w15szqgy0540o65bcx08b1w876rx08b08pylpg04u02q0enk05w1ihz1rl06t0t3b9at0b10qywm2t05v0xdn5wo0gh1mwmbxp05v1lroe9g0ig1u8sc0c06r0nw9z5k05t1czxpzs04t12nsk3a06t1tj0dm705a06fyb5105a1ybkm6l02y07ekcmb0qr027y4b504y05vfzkt05w1hw03na0ig0szvm7u06c',u='0cn66d91et18mbpmc0wt0n23k590p01qb6nz00nr1ihz1rl0hw103ftn40fe1ybkm6l0b4',y='0cfghbg2n12ccm3g3c0yol9ay2z0szvm7u2w',F=new Map(),U=new Map(),Y=new Map();
for(let i=0;i<f.length;i+=10)F.set(f.slice(i,i+7),parseInt(f.slice(i+7,i+10),36));
for(let i=0;i<u.length;i+=10)U.set(u.slice(i,i+7),parseInt(u.slice(i+7,i+10),36));
for(let i=0;i<y.length;i+=9)Y.set(y.slice(i,i+7),1900+parseInt(y.slice(i+7,i+9),36));
let n=0;for(const k in W.FARD){const value=F.get(h(k)),a=W.FARD[k];if(value==null||!a)continue;a[0]=value;a[1]='R';n++}
for(const d of W.PICKS||[]){const k=h(d.n+'|'+d.area),units=U.get(k),year=Y.get(k);if(units)d.units=units;if(year)d.year=year}
W.RICHGO30_LIVE_N=n;
})(window);
