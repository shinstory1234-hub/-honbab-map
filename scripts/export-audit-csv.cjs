// Audit export. Reads current live rankings from the deployed browser, not historical snapshots.
// Intended to run on an isolated GitHub branch; never updates site scoring code.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const caps=[6,10,15,20,25,30];
const labels={6:'6억 이하',10:'6~10억',15:'10~15억',20:'15~20억',25:'20~25억',30:'25~30억'};
const dir=path.resolve(__dirname,'../audit-exports');
fs.mkdirSync(dir,{recursive:true});

const headers=['추출기준(KST)','가격대','순위','단지명','지역','평형(평)','최근시세(만원)','시세(억원)','종합점수','점수모델','상품성_원점수(연식보정)','세대수_평가적용','세대수_보정후(지도표시)','세대수_수정전','세대수_수정시_분리개수','세대수_공식값여부','세대수_출처','세대수_매매가능(직접보정)','임대단지여부','입주연도','용적률_원본(%)','용적률_원본출처','용적률_고밀도판정사용값(%)','용적률_감점출처','고밀도감점(점)','주상복합판정','초고밀주상복합MIXHI','세대수백분위','장기급지백분위','장기급지_원점수','장기급지_원점수출처','장기급지_자체실측여부','급지_지역보정값','입지백분위','상승여력백분위','상품성백분위','교통점수','최고교통역','교통노선','노선등급','역까지도보시간(분)','세대수비중','급지비중','상품성비중','교통비중','입지비중','상승여력비중','모델감점전점수','최종점수','소형감점','단지내평당가보정','재건축대상(상품성)','상품성_입지제한계수','언덕감점','역거리감점','초대단지가점','재건축사업성감점','현시세대비상승여력(%)','가격근거_12개월거래','가격근거_3개월거래','최근거래일','원본_표시세대수','원본_그룹합계세대수','단지식별키','상세점수산식'];

function esc(x){
 if(x===undefined||x===null||Number.isNaN(x))return '';
 const s=String(x);
 return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
}
function csv(file,rows){
 fs.writeFileSync(path.join(dir,file),'\uFEFF'+[headers.join(','),...rows.map(r=>r.map(esc).join(','))].join('\r\n')+'\r\n','utf8');
}

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const now=new Date().toLocaleString('sv-SE',{timeZone:'Asia/Seoul'});
 const date=now.slice(0,10);
 const all=[], summary=[];
 try{
  for(const cap of caps){
   const page=await browser.newPage({viewport:{width:1366,height:768},ignoreHTTPSErrors:true});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message.slice(0,250)));
   try{
    const url='https://aptmap-kr.vercel.app/'+(cap===6?'':'?cap='+cap);
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForFunction(()=>{
     try{return typeof ORDER!=='undefined'&&ORDER.length>100&&ORDER.at(-1)?.rank===ORDER.length}catch{return false}
    },{timeout:120000});
    await page.waitForTimeout(1000);
    const obj=await page.evaluate(()=>({
     model:window.S4CFG?.model||'',
     config:window.S4CFG||{},
     data:ORDER.map(d=>{
      const key=d.cxKey||d.n+'|'+d.area;
      const f=window.FARD?.[key]||[];
      const uf=window.UNITFIX?.[key]||[];
      const tr=d.types?.find(x=>x.py===d.py)||{};
      const p=d.s4||{}, za=p.za||{}, dn=p.density||{}, ta=p.ta||{}, w=p.w||{};
      const bt=p.transport?.best||{}, qw=p.qGate||{};
      const mix=!!(window.MIXHI&&window.MIXHI.has(d.area.split(' ').pop()+'|'+d.n));
      const isjb=typeof isJubok==='function'?isJubok(d):null;
      const calc=typeof s4ScoreDetail==='function'?s4ScoreDetail(d):'';
      const assessed=d.unitsOwn??d.units;
      const prodRaw=typeof s4Prod==='function'?s4Prod(d).v:null;
      return {key,rank:d.rank,n:d.n,area:d.area,py:d.py,price:d.p,score:d.score,
        model:window.S4CFG?.model||'',prodRaw,pQ:p.pQ,unitsAssess:assessed,
        units:d.units,unitsRaw:d.unitsRaw??null,unitsN:d.unitsN??null,
        unitK:d.unitsK??false,unitfix:uf,unitsOwn:d.unitsOwn??null,rent:!!d.rent,
        year:d.year,fard:f,density:dn,isjb,mix,pU:p.pU,pG:p.pG,
        gj:d.gj,gjsrc:d.gjsrc,gjc:d.gjc,os:d.os,pLoc:p.pLoc,pUp:p.pUp,
        trScore:p.transport?.score,bt,w,modelComp:p.modelComp,za,rbprod:p.qrb,
        qGate:qw,ta,dp:p.dp,up:d.up,n12:tr.n,n3:tr.n3,last:tr.last,
        origUnits:d.units,groupUnits:d.unitsRaw,calc};
     })
    }));
    const rows=obj.data.map(d=>[now,labels[cap],d.rank,d.n,d.area,d.py,d.price,Number((d.price/10000).toFixed(4)),
      d.score,d.model,d.prodRaw,d.unitsAssess,d.units,d.unitfix[1]??d.unitsRaw,d.unitfix[2]??d.unitsN,
      d.unitfix[3]==='k'||d.unitK,d.unitfix[3]==='k'?'K-apt':'수집값/추정',d.unitsOwn,d.rent,d.year,
      d.fard[0],d.fard[1],d.density.far,d.density.src,d.density.pen,d.isjb,d.mix,d.pU,d.pG,
      d.gj,d.gjsrc,d.gjc,d.os,d.pLoc,d.pUp,d.pQ,d.trScore,d.bt.station,d.bt.line,d.bt.grade,
      d.bt.minutes,d.w.u,d.w.g,d.w.q,d.w.t,d.w.l,d.w.p,d.modelComp,d.score,d.za.sm,d.za.pp,
      d.rbprod,d.qGate?.g,d.ta.h,d.ta.w,d.ta.mb,d.dp,
      d.up==null?null:Number((d.up*100).toFixed(2)),d.n12,d.n3,d.last,d.origUnits,d.groupUnits,
      d.key,d.calc]);
    if(rows.length!==obj.data.length||rows.some((row,i)=>row[2]!==i+1))throw new Error('Rank integrity failure '+cap);
    if(rows.some(row=>row.length!==headers.length))throw new Error('Column integrity failure '+cap);
    const file='aptmap_audit_'+cap+'_'+date+'.csv';
    csv(file,rows);
    all.push(...rows);
    summary.push({cap,model:obj.model,count:rows.length,rawFarKnown:rows.filter(r=>r[20]!=null).length,
      penalizedDensity:rows.filter(r=>Number(r[24])>0).length,unitsOwn:rows.filter(r=>r[17]!=null).length,
      errorCount:errors.length,config:obj.config});
    console.log('DONE',cap,rows.length,obj.model,errors.length);
   }finally{await page.close();}
  }
  csv('aptmap_audit_ALL_'+date+'.csv',all);
  const metadata={createdKST:now,source:'https://aptmap-kr.vercel.app/',columns:headers,summary,
    description:'현재 배포된 사이트에서 ORDER 배열을 직접 읽음. 단지별 점수/순위 재계산 또는 수동 보정 없음.'};
  fs.writeFileSync(path.join(dir,'aptmap_audit_metadata_'+date+'.json'),JSON.stringify(metadata,null,2),'utf8');
  if(all.length<10000)throw new Error('Unexpected total '+all.length);
  console.log('COMPLETE',all.length);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
