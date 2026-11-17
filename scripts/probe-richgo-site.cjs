// User-initiated audit, public sitemap + specific apartment page only.
(async()=>{
 for(const url of ["https://m.richgo.ai/realty/danji/a7YZWFo","https://m.richgo.ai/realty/danji/a0tgTNQ","https://m.richgo.ai/region.xml"]){
  try{
   const r=await fetch(url,{headers:{"User-Agent":"ChatGPT-User","Accept":"text/html,application/xml"},signal:AbortSignal.timeout(30000)});const t=await r.text();
   const urls=[...t.matchAll(/href=["']([^"']*\/realty\/danji\/a[A-Za-z0-9]{6}[^"']*)["']/g)].map(x=>x[1]);const seen=[...new Set(urls)];
   console.log("SOURCE",url,"HTTP",r.status,"SIZE",t.length,"PROPERTIES",seen.length,"SAMPLE",seen.slice(0,15));
   for(const word of ["용적률","세대수","2019.11","%","danjiName","올림픽선수기자촌"]){
    const pos=t.indexOf(word);console.log("SNIP",word,pos,pos<0?"":t.slice(Math.max(0,pos-350),pos+650));
   }
   if(url.endsWith(".xml"))console.log("REGIONS",[...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]).slice(0,25));
  }catch(e){console.log("ERR",url,String(e));}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
