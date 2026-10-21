// 6억지도 점수 비교 하네스(테스트 전용): 고정 입지 데이터(GEOFIX)로 두 버전 페이지의 점수를 계산해 비교
const { chromium } = require('playwright'); const fs=require('fs');
const [,, A, B, OUT]=process.argv;
(async()=>{
  const fix=await (await fetch('https://realestate-media.vercel.app/api/backtest/aptgeo?export=js')).text();
  const b=await chromium.launch();
  const run=async file=>{ const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.route(/dapi\.kakao|jsdelivr|open-meteo/,r=>r.abort());
    await p.addInitScript(fix);                         // 두 버전 모두 같은 입지 데이터
    await p.goto('file://'+file); await p.waitForTimeout(1500);
    const r=await p.evaluate(()=>{ for(const [k,v] of Object.entries(window.GEOFIX)) GEO[k]=k==='__fut2'?v:Object.assign({},v,{gv:1});
      FUTPOS=GEO.__fut2||null; recompute();
      return D.map(d=>({k:gkey(d),score:d.score,loc:d.loc,up:d.up,upR:d.upR,rb:d.rb,fw:d.fw,conf:d.conf,T:d.T,A:d.A,E:d.E,F:d.F,mp:(d.mp||[]).map(x=>[x[0],Math.round(x[1]*1000)/1000])})); });
    await p.close(); return {r,errs:errs.slice(0,5)}; };
  const ra=await run(A), rb=await run(B);
  fs.writeFileSync(OUT,JSON.stringify({A:ra,B:rb})); await b.close();
  console.log('errs',ra.errs,rb.errs,'n',ra.r.length,rb.r.length);
})();
