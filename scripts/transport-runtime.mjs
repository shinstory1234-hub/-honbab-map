import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
export function run(root,cap){
 const noop=()=>{};
 const el={style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop},addEventListener:noop,setAttribute:noop,getAttribute:()=>'',scrollIntoView:noop,querySelector:()=>null,querySelectorAll:()=>[],appendChild:noop};
 const c={console,URL,URLSearchParams,location:{search:`?cap=${cap}&ok=1`,href:`https://aptmap-kr.vercel.app/apt-map.html?cap=${cap}`},localStorage:{getItem:()=>null,setItem:noop},setTimeout:noop,clearTimeout:noop,addEventListener:noop,matchMedia:()=>({matches:false}),document:{getElementById:()=>el,querySelector:()=>el,querySelectorAll:()=>[],createElement:()=>({...el}),head:el,addEventListener:noop},};
 c.window=c;c.parent=c;vm.createContext(c);
 const missing=[];
 c.document.write=s=>{const f=/src="([^"]+)"/.exec(s)?.[1];if(!f)return;let p=path.join(root,'public',f);if(!fs.existsSync(p)&&process.env.TRANSPORT_INPUTS)p=path.join(process.env.TRANSPORT_INPUTS,f);if(!fs.existsSync(p)){missing.push(f);return;}vm.runInContext(fs.readFileSync(p,'utf8'),c,{filename:f});};
 const html=fs.readFileSync(path.join(root,'public/apt-map.html'),'utf8');
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 vm.runInContext(scripts.find(s=>s.includes('var F=')),c);
 vm.runInContext(scripts.find(s=>s.includes('function recompute()')).split('let qT=null;')[0],c,{filename:'apt-map.html'});
 vm.runInContext('updatePins=()=>{}; recompute();',c);
 const rows=JSON.parse(vm.runInContext('JSON.stringify(ORDER.map(d=>({key:d.cxKey,n:d.n,area:d.area,py:d.py,rank:d.rank,sib:d.sib,score:d.score,s4:d.s4,sts:d.g?.sts,pending:d.pending})))',c));
 return {c,rows,missing};
}
