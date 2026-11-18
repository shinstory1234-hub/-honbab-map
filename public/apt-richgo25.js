/* 20~25억 전용: 리치고 전체 372개 좌표 검증, 수치가 바뀐 값만 용적률·세대수·연도 반영.
  원자료: docs/richgo-20to25-all372-audit-20261118.csv. 타 가격대·실거래 금액 미변경. */
(function(w){
if(w.CAPT!==25)return;
const h=s=>{let x=5381;for(let i=0;i<s.length;i++)x=((x*33)^s.charCodeAt(i))>>>0;return x.toString(36).padStart(5,'0').slice(-5)};
const read=(s,n)=>{let m=new Map();for(let i=0;i<s.length;i+=5+n)m.set(s.slice(i,i+5),parseInt(s.slice(i+5,i+5+n),36));return m};
const f=read('v053o77hdq6c6yxdbts7vfltkt7l3jnww7xpat688o7j2oo6xg357165uy2t86xty67g6brt7ln5v5z54z7lioe4o6xb3bfw71n5lu87cxbj7t6s3m2jk71dr3uw6elcvhra9i11og704zz926ilzad46xrtnb87kzgw805f8hb3s8b7yqn16xf3eos68vxic06s02ajw5skgsx16xd1foo6t658686zc390x6hypoqe659musp6u1ripi61ccm3g7p6myfo70csuzj7ouxros5tzecvx4lfp42j6koaar05nn98e58bkm6wp6ho3hd16drx2p39z65bcx8bxnck5803ew1t6xmg0lo6s5fxax67e13i86j876rx8b8dgq9b2nn9546xgewuz6ne18ng6fy22nt6wv1fup8qnx9e58430l0b5eyqp7e6xgt8db70aih4t6qfx4q35lltsmb6xon1u35sbsnbj5h0sm2d64tifys6okzu7566fghbg623cft26uj45ve7sk41js68s72lz6x7mk5q6wxxu2h46lv7no6618nw55l56mxk58uctvr59aenxn8b1o86z6zhz1rl6tyq34h7pdwmg871rbuhhb3q0enk5wsku5w4z0968z6pppbfl4mm8qqg6d1sc9b5v1lo9w5bc26gd7bnsk3a6tr9abs656hcgi6nqubnk81qaza187p4cpf7chiues6gky93h7g8sc0c6r8tdrl6x2eb0l5prxnb16xkoshd9hhppb9b1ngx9x5bjcr5e7ljjm2m6xf79u482fzuof6h9o2c0826fjwp4fpylpg4umg2f5bxfealg5yx64ne6mdkc4y5fie1qs4pibstb6nlzw1k5s5zdco46k5sjc7eevc4d4uqz6bt6cswt6o8a2q85r6nbvauj4yw9z5k5tei3qb9dayezd6skgw717srxqli5icy7ax6xrrfl554kcozd5bzjsj04t46ool8b6i8ambiqrfrt5t6crd245jnamp9vtu2ck5osyn7s5gywm2t5vuofcj5thvs917klkx516xa4dh86xuko004r9osc36do0pqp5lvlpjb5ii7eax63j6pl16z52b9488f23lo8s6l7tw4pmg3co8v8w19x6lqpupz52wmbxp5vu1zlhbij6t3y68fhda47oaowww5tmu0y09uscme9agqqdm85j6ij515tqu4lx5ieclmy71eyrol52hn4w94509pxo5m3stfm5y5wsq05399afs4zgqxab87wt1o4636v2i87e6rjwp5mbq9z17gmye9x52tqelg78s3ub25vpupao7m5bjse6xvwshk5v3qy2p6vvk3dw690l85p7jn0vpc4zjmgxk5jj1w886frpg3983lnx4odc2r6w15txyz0o4znodzs797loeq4ag5eh8n36fm2qgesc27q6pjlv846ydgyk09f3i7ow87qrblc8t4xtbllxzkr1n4dkwrjs5ozt0yk4yixio06agy5hx4diwfj94zcyjx45v9zzpl52q3xwt6qtiu2m5vcvednfsovx3hki7n8i68b9qnqn86yqhin411tgvw58usdr46enoxas4iux0wra6roe9gigckpox83p3bwh7shcysf84f6ut6907x8bt76hn5fhar330tp6vl80n0dv23k59633b9atb1w03naigfyb515ausyue6jx4yok59yr5uz5vo75fyex8fq4hropi97c44bvslm45vtke94utedso4i57i6e5tejlqra3tgghwkqkbwbc57m1sz340pb8zb9zjim3j6dq3grhjfeytxw46ekcmbqrvzn845p86dat63pmv44andnlgjia',2),u=read('dr3uw0wcf3eos1ba34s0m1cu65868150oaar00wan16j70i8tt6ux0ov7rp3d1lce18ng3z22btp40gs0sm2d0y2w7u541jc3cft20vwqrblc0n61o86z0izg3uaj0owc26gd0uyb7d5p0hwtxuhl0piii30g0m2ibstb1kd6i8am0aip9jh90bnu1zlh0wpmnx6s0dcvgl6d0kt5gi5b0b01pgja11us3ub22c4kd32s0aij1w880cxp6e6x0nanodzs0qog5eh80fjdnlgj02i6fm2q0463i7ow08l4xtbl08mkwrjs0cgcyjx42c4ovx3h0fq9qnqn0kxux0wr0ex5ldhk0cao75fy0koq3grh095',3),y=read('xdbts1k1g35711k55z54z1k6ccm3g1k4mg0lo1k7i54zg1k6e13i81jx0sm2d1k4fghbg1jfzvm7u1josk8hl1jdol9ay1jra4dh81k2zp0l91j999afs1jd6v2i81k43qy2p1k6lnx4o1k49qnqn1k5yr5uz1jdejlqr1k7',3),F=w.FARD||{},U=w.UNITFIX_M3||(w.UNITFIX_M3={}),D=w.UNITDROP_M3||(w.UNITDROP_M3=[]);
/* 재검증: 리치고 통합 단지 세대수를 개별 블록에 덮어쓰지 않음. */
for(const k of ['파크타운(롯데)|성남 분당구 수내동','파크타운(삼익)|성남 분당구 수내동'])u.delete(h(k));
/* DMC SK VIEW는 시공사 확인 전체 753세대, 2021년 입주. 통합 단지 기준 적용. */
const protectedUnits=new Map([['파크타운(롯데)|성남 분당구 수내동',841],['파크타운(삼익)|성남 분당구 수내동',638]]);
const done=new Set();let a=0,b=0,c=0;
for(const d of w.PICKS||[]){let k=d.n+'|'+d.area,j=h(k),first=!done.has(k);
/* 과거 보정 스크립트가 이미 적용한 753 등 통합값도 명시적으로 복구 */
if(protectedUnits.has(k)){const n=protectedUnits.get(k),old=d.units;d.units=n;U[k]=[n,old,0,'reverified-individual-block'];}

if(f.has(j)){let v=F[k]||(F[k]=[null,'',null,null,null,null,null]);v[0]=f.get(j);v[1]='리치고(전체372 직접확인)';if(first)a++;const p=w.PLAT?.[k];if(p&&p.length>2)p[2]=v[0]}
if(u.has(j)){let n=u.get(j),old=d.units;d.units=n;U[k]=[n,old,0,'richgo'];if(n<300&&!D.includes(k))D.push(k);if(first)b++}
if(y.has(j)){d.year=y.get(j);if(first)c++}
done.add(k)}
w.RICHGO25_APPLIED={verified:18,farVerified:17,farValueChanges:5,unitChanges:7,excludedBelow300:2,skipped:0};
w.RICHGO25_TOP300_PATCH={rankingRows:300,verified:300,farDiffs:207,unitDiffs:33,yearDiffs:18,appliedFar:a,appliedUnits:b,appliedYears:c};
w.RICHGO25_FULL_PATCH={rankingRows:372,verified:372,geoVerified:372,farDiffs:257,unitDiffs:43,yearDiffs:21,farAbsent:5,appliedFar:a,appliedUnits:b,appliedYears:c};
})(window);
