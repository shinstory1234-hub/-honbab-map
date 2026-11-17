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
