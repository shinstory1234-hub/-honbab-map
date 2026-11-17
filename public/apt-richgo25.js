/* 2026-11-18: Richgo public apartment detail pages verified one by one.
 * Applies solely to the 20~25억 band; loads AFTER apt-far-normalize.js.
 * Never synthesize a missing Richgo FAR and never replace transaction prices with Richgo model prices.
 */
(function(W){
 if(W.CAPT!==25)return;
 // gkey: [Richgo FAR or null, original apartment-map units, Richgo units, completion year, Richgo danji ID]
 const V={
  '경희궁의아침2단지|서울 종로구 내수동':[658,462,90,2004,'a3leodY'],
  '경희궁의아침3단지|서울 종로구 내수동':[590,767,150,2004,'a7qzYub'],
  '경희궁자이(3단지)|서울 종로구 평동':[241,589,589,2017,'a1Ucmro'],
  '경희궁자이(2단지)|서울 종로구 홍파동':[252,1148,1148,2017,'a5uKSCI'],
  '용산e편한세상|서울 용산구 신계동':[250,867,867,2011,'a4ywhbN'],
  '강촌|서울 용산구 이촌동':[339,1001,1001,1998,'a5PKAoB'],
  '동부센트레빌|서울 용산구 이촌동':[295,310,309,2001,'a0xIAWP'],
  '북한강(성원)|서울 용산구 이촌동':[376,340,340,2001,'a2nsbJC'],
  '이촌코오롱(A)|서울 용산구 이촌동':[317,787,834,1999,'a5OFMQy'],
  '현대한강|서울 용산구 이촌동':[383,516,516,1997,'a1lMwBO'],
  '용산파크자이|서울 용산구 한강로1가':[789,1363,310,2005,'a5ofAUR'],
  '양지마을(5단지)(한양515-529)|성남 분당구 수내동':[157,1430,1430,1992,'a5rFSzF'],
  '극동1|서울 광진구 광장동':[204,1344,448,1985,'a7IoUKm'],
  '극동2|서울 광진구 광장동':[null,1344,896,1989,'a2MhWUs'],
  '삼환|서울 송파구 가락동':[178,648,648,1984,'a6kgvOO'],
  '서울숲2차푸르지오|서울 성동구 금호동4가':[226,586,586,2012,'a7dmGTG'],
  '한양아파트|서울 송파구 송파동':[157,576,576,1983,'a1CXalG'],
  '문정가락현대1차|서울 송파구 문정동':[179,514,514,1984,'a6oOVEU']
 };
 const P=W.PICKS||[],F=W.FARD||{},U=W.UNITFIX_M3||(W.UNITFIX_M3={}),
  drop=W.UNITDROP_M3||(W.UNITDROP_M3=[]);
 let verified=0,farVerified=0,farValueChanges=0,unitChanges=0,excludedBelow300=0,skipped=0;
 for(const [k,[far,oldUnits,richgoUnits,year,id]] of Object.entries(V)){
  const ds=P.filter(d=>d.n+'|'+d.area===k);
  if(!ds.length||ds.some(d=>d.units!==oldUnits||d.year!==year)){skipped++;continue;}
  verified++;
  if(richgoUnits!==oldUnits){
   ds.forEach(d=>{d.units=richgoUnits;});
   U[k]=[richgoUnits,oldUnits,0,'richgo']; // fixUnits() otherwise uses a global K-apt mapping.
   unitChanges++;
  }
  // Previously spurious large mixed apartment+officetel complexes were eligible despite <300 real apartment units.
  if(richgoUnits<300&&!drop.includes(k)){drop.push(k);excludedBelow300++;}
  if(far!==null){
   const f=F[k]||(F[k]=[null,'',null,null,null,null,null]);
   if(Number(f[0])!==far)farValueChanges++;
   f[0]=far;
   f[1]='리치고(단지 직접확인)';
   farVerified++;
  }
 }
 W.RICHGO25_APPLIED={verified,farVerified,farValueChanges,unitChanges,excludedBelow300,skipped};
})(window);


/* Ranked 300 (2026-11-14 snapshot): 300 audited, website details 2026-11-18.
   Compact per-complex verified corrections: 7-char DJB2 key + 3-char base36 value.
   Only differences; raw transaction prices and unrelated bands unchanged. */
(function(W){if(W.CAPT!==25)return;
 const h=k=>{let z=5381;for(let i=0;i<k.length;i++)z=((z*33)^k.charCodeAt(i))>>>0;return z.toString(36).padStart(7,'0');};
 const decode=s=>{const m=new Map();for(let i=0;i<s.length;i+=10)m.set(s.slice(i,i+7),parseInt(s.slice(i+7,i+10),36));return m;};
 const F=decode('0qv053o07715hdq6c06y02xdbts07v0ufltkt07l163jnww07x15pat6808o0o7j2oo06x1hg35710650quy2t806x12ty67g06b1drt7ln05v0e5z54z07l0wioe4o06x19b3bfw07107n5lu807c1uxbj7t06s0k3m2jk0711xdr3uw06e1vlcvhr0a91fi11og0701x4zz9206i1qlzad406x0srtnb807k0bzgw8005f0w8hb3s08b1w7yqn106x0yf3eos0681qvxic006s0p02ajw05s0xkgsx106x0ad1foo06t0t6586806z08c390x06h0iypoqe0651w9musp06u1m1ripi06112ccm3g07p136myfo0701jcsuzj07o08uxros05t0ezecvx04l0yfp42j06k1goaar005n1rn98e508b1lkm6wp06h1ao3hd103b00rx2p309z0o65bcx08b0pxnck50801c3ew1t06x0tmg0lo06s015fxax0670ve13i806j1w876rx08b188dgq90b21onn95406x0ngewuz06n05e18ng06f08y22nt06w1dv1fup08q1dnx9e50840h30l0b05e1hyqp7e06x1tgt8db07007aih4t06q1qfx4q305l09ltsmb06x0kon1u305s1tbsnbj05h030sm2d06409tifys06o1bkzu750660cfghbg062133cft206u0oj45ve07s0rk41js0681qs72lz06x1f7mk5q06w0gxxu2h0460llv7no0661g18nw505l0o56mxk0580euctvr0591qaenxn08b1y1o86z06z1ihz1rl06t0tyq34h07p17dwmg807119rbuhh0b302q0enk05w1rsku5w04z070968z06p1qppbfl04m1wm8qqg06d011sc9b05v1s1lo9w05b0oc26gd07b12nsk3a06t1ar9abs0650i6hcgi06n08qubnk0810eqaza10870mp4cpf07c0zhiues06g06ky93h07g1u8sc0c06r0k8tdrl06x0l2eb0l05p0qrxnb108a04koshd09h1qhppb90b106ngx9x05b0ajcr5e07l0cjjm2m06x0kf79u40820cfzuof06h1h9o2c0082176fjwp04f08pylpg04u1cmg2f50bx0gfealg05y0bx64ne06m01dkc4y05f1xie1qs04p0uibstb06n0elzw1k05s1j5zdco0461fk5sjc07e05evc4d04u03qz6bt06c1fswt6o08a112q85r06n0jbvauj04y0nw9z5k05t0eei3qb09d1xayezd06s0ikgw7107s1krxqli05i0ocy7ax06x1jrrfl505401kcozd05b0qzjsj004t0u46ool08b1m6i8am0bi1eqrfrt05t1t6crd204514jnamp09v1btu2ck05o1gsyn7s05g0qywm2t05v0yuofcj05t1ihvs9107k1tlkx5106x02a4dh806x02uko0004r1y9osc306d0yo0pqp05l0lvlpjb05i1xi7eax0630oj6pl106z0o52b940881ef23lo08s1n6l7tw04p19mg3co08v058w19x06l05qpupz0521mwmbxp05v1iu1zlh0bi1vj6t3y06814fhda407o0aaowww05t0cmu0y009u16scme90ag11qqdm805j1f6ij5105t12qu4lx05i0jeclmy07109eyrol05203hn4w90451o09pxo05m1d3stfm05y1n5wsq00531y99afs04z1fgqxab08708wt1o4063166v2i807e106rjwp05m04bq9z107g0emye9x0521mtqelg0781ss3ub205v1hpupao07m085bjse06x02vwshk05v1d3qy2p06v02vk3dw0690f0l85p07j1pn0vpc04z1ajmgxk05j0gj1w8806f0qrpg390830mlnx4o0dc092r6w105t0axyz0o04z11nodzs0791v7loeq04a0og5eh80n3');
 const U=decode('1xdr3uw0wc0yf3eos1ba1f34s0m1cu0t658681501goaar00wa1in16j70i81ao3hd10ca18tt6ux0ov0b7rp3d1lc05e18ng3z20j2btp40gs030sm2d0y20sw7u541jc133cft20vw09qrblc0n61y1o86z0iz1ng3uaj0ow0oc26gd0uy1fb7d5p0hw0qrxnb105o1rtxuhl0pi13ii30g0m20uibstb1kd1m6i8am0ai0ep9jh90bn1iu1zlh0wp1mmnx6s0dc1mvgl6d0kt065gi5b0b01w1pgja11u1ss3ub22c403kd32s0ai0gj1w880cx1lp6e6x0na11nodzs0qo0og5eh80fj');
 const Y=decode('02xdbts1k11hg35711k50e5z54z1k612ccm3g1k41ao3hd11jv0tmg0lo1k70ki54zg1k60ve13i81jx030sm2d1k40cfghbg1jf0qrxnb11jl0szvm7u1jo0msk8hl1jd0yol9ay1jr02a4dh81k20jzp0l91j91y99afs1jd166v2i81k41d3qy2p1k60mlnx4o1k4');
 const unitFix=W.UNITFIX_M3||(W.UNITFIX_M3={}),drop=W.UNITDROP_M3||(W.UNITDROP_M3=[]);
 let ff=0,uu=0,yy=0;
 const touched=new Set();
 for(const d of W.PICKS||[]){const key=d.n+'|'+d.area,id=h(key);
  if(F.has(id)){
   const old=(W.FARD||{})[key]||((W.FARD||{})[key]=[null,'',null,null,null,null,null]);
   old[0]=F.get(id);old[1]='리치고(상위300 직접확인)';
   const plat=(W.PLAT||{})[key];if(plat&&plat.length>=3)plat[2]=old[0];
   if(!touched.has(key))ff++;
  }
  if(U.has(id)){const n=U.get(id),orig=d.units;d.units=n;unitFix[key]=[n,orig,0,'richgo'];
   if(n<300&&!drop.includes(key))drop.push(key);if(!touched.has(key))uu++;
  }
  if(Y.has(id)){d.year=Y.get(id);if(!touched.has(key))yy++;}
  touched.add(key);
 }
 W.RICHGO25_TOP300_PATCH={rankingRows:300,verified:300,farDiffs:207,unitDiffs:36,yearDiffs:20,appliedFar:ff,appliedUnits:uu,appliedYears:yy};
})(window);
