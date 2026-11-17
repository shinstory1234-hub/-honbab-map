// Private audit diagnostics: check public sitemap/robots availability before targeted page verification.
(async()=>{
 for(const url of ["https://m.richgo.ai/robots.txt","https://m.richgo.ai/sitemap.xml","https://m.richgo.ai/realty/danji/a0tgTNQ","https://m.richgo.ai/realty/danji/search?q=%EC%8B%9C%EB%B2%94%ED%95%9C%EC%96%91"]){
  try{
   const r=await fetch(url,{headers:{"User-Agent":"ApartmentMapAudit/1.0 (manual user-directed verification)","Accept":"text/html,application/xml,text/plain"},signal:AbortSignal.timeout(14000)});
   const t=await r.text();console.log("PAGE",url,"STATUS",r.status,"TYPE",r.headers.get("content-type"),"LENGTH",t.length,"START",t.slice(0,1500).replace(/\s+/g," ")); if(url.endsWith("sitemap.xml")){const urls=[...t.matchAll(/<loc>([^<]*)<\/loc>/g)].map(x=>x[1]);console.log("SITEMAP URL COUNT",urls.length,"FIRST",urls.slice(0,16));}
  }catch(e){console.log("ERR",url,e.stack?.slice(0,400));}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
