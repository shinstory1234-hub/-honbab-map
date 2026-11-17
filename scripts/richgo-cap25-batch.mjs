import fs from 'node:fs';
const urls=[
 'https://m.richgo.ai/robots.txt',
 'https://m.richgo.ai/danji_detail.xml',
 'https://m.richgo.ai/danji_detail_gyeonggido.xml',
 'https://m.richgo.ai/realty/apt-hub/%EC%84%9C%EC%9A%B8/%EB%A7%88%ED%8F%AC%EA%B5%AC',
 'https://m.richgo.ai/realty/apt-hub/%EA%B2%BD%EA%B8%B0/%EA%B3%BC%EC%B2%9C%EC%8B%9C',
 'https://www.google.com/search?q=site%3Am.richgo.ai%2Frealty%2Fdanji+%22%EB%A7%88%ED%8F%AC%ED%94%84%EB%A0%88%EC%8A%A4%ED%8B%B0%EC%A7%80%EC%9E%90%EC%9D%B4%22'
];
const res=await Promise.all(urls.map(async url=>{try{
 const r=await fetch(url,{signal:AbortSignal.timeout(21000),headers:{'User-Agent':'Mozilla/5.0 (compatible; ApartmentMapResearch/1.0; +https://github.com/shinstory1234-hub/-honbab-map)'}});
 const s=await r.text();
 const ids=[...new Set(s.split('/realty/danji/').slice(1).map(x=>x.match(/^[A-Za-z0-9]+/)?.[0]).filter(Boolean))];
 const anchors=[];
 return {url,status:r.status,len:s.length,head:s.slice(0,url.endsWith('robots.txt')?7000:1300),idsCount:ids.length,ids:ids.slice(0,12),anchors,exampleAroundDanji:(()=>{let j=s.indexOf('/realty/danji/');return j<0?'':s.slice(Math.max(0,j-200),j+500)})()};
 }catch(e){return {url,error:String(e)}}
}));
fs.writeFileSync('docs/richgo-cap25-lookup-diagnostics.json',JSON.stringify(res,null,2)+'\n');
console.log(JSON.stringify(res.map(x=>({url:x.url,status:x.status,len:x.len,error:x.error,idsCount:x.idsCount,head:x.head?.slice(0,600)})),null,2));
