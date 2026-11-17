(async()=>{
 for(const url of ["https://m.richgo.ai/robots.txt","https://m.richgo.ai/danji_detail_seoul.xml","https://m.richgo.ai/danji_detail_gyeonggido.xml","https://m.richgo.ai/danji_detail.xml","https://m.richgo.ai/danji_detail_incheon.xml"]){
  try{
   const r=await fetch(url,{headers:{"User-Agent":"ApartmentMapAudit/1.0","Accept":"text/html,application/xml,text/plain"},signal:AbortSignal.timeout(20000)});
   const t=await r.text(),loc=[...t.matchAll(/<loc>([^<]*)<\/loc>/g)].map(x=>x[1]);
   console.log("CHECK",url,"HTTP",r.status,"SIZE",t.length,"LOCS",loc.length,"SAMPLE",loc.slice(0,3));if(url.endsWith('robots.txt'))console.log("ROBOTS FULL",t);
  }catch(e){console.log("ERR",url,String(e));}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
