import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
export function run(root,cap,compiled=false){
 const noop=()=>{};
 const el={style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop},addEventListener:noop,setAttribute:noop,getAttribute:()=>'',scrollIntoView:noop,querySelector:()=>null,querySelectorAll:()=>[],appendChild:noop};
 const c={console,URL,URLSearchParams,performance,location:{search:`?cap=${cap}&ok=1`,href:`https://aptmap-kr.vercel.app/apt-map.html?cap=${cap}`},localStorage:{getItem:()=>null,setItem:noop},setTimeout:noop,clearTimeout:noop,setInterval:noop,clearInterval:noop,requestAnimationFrame:noop,cancelAnimationFrame:noop,addEventListener:noop,matchMedia:()=>({matches:false}),document:{getElementById:()=>el,querySelector:()=>el,querySelectorAll:()=>[],createElement:()=>({...el}),head:el,addEventListener:noop},};
 c.window=c;c.parent=c;vm.createContext(c);
 const missing=[];
 const deferred=[];
 const evaluateFile=f=>{
   let p=path.join(root,'public',f);
   if(!fs.existsSync(p)&&process.env.TRANSPORT_INPUTS)p=path.join(process.env.TRANSPORT_INPUTS,f);
   if(!fs.existsSync(p)){missing.push(f);return;}
   if(f==='apt-livefix.js'&&process.env.APT_AUDIT_PRELIVE==='1') {
     c.__APT_PRELIVE=JSON.parse(vm.runInContext(`JSON.stringify(PICKS.filter(x=>/어바인퍼스트/.test(x.n)).map(x=>({n:x.n,area:x.area,py:x.py,p:x.p,types:x.types})))`,c));
   }
   let code=fs.readFileSync(p,'utf8');
   if(compiled&&code.includes('function recompute()')) code=code.split('let qT=null;')[0];
   const pre=process.env.APT_AUDIT_PRELIVE==='1'&&c.PICKS?
     c.PICKS.find(x=>x.n==='평촌어바인퍼스트')?.types?.map(x=>[x.py,x.p,x.n]):null;
   vm.runInContext(code,c,{filename:f});
   if(process.env.APT_AUDIT_PRELIVE==='1'&&c.PICKS){
     const post=c.PICKS.find(x=>x.n==='평촌어바인퍼스트')?.types?.map(x=>[x.py,x.p,x.n])||null;
     if(JSON.stringify(pre)!==JSON.stringify(post)){
       c.__APT_MUTATION_TRACE=c.__APT_MUTATION_TRACE||[];
       c.__APT_MUTATION_TRACE.push({file:f,before:pre,after:post});
     }
   }
 };
 c.document.write=s=>{for(const match of s.matchAll(/<script([^>]+)>/g)){
   const f=/src="([^"]+)"/.exec(match[1])?.[1];if(!f)continue;
   if(/\bdefer\b/.test(match[1]))deferred.push(f);else evaluateFile(f);
 }};
 const html=fs.readFileSync(path.join(root,compiled?'public/apt-map-fast.html':'public/apt-map.html'),'utf8');
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 vm.runInContext(scripts.find(s=>s.includes('var F=')),c);
 if(compiled) deferred.forEach(evaluateFile);
 else vm.runInContext(scripts.find(s=>s.includes('function recompute()')).split('let qT=null;')[0],c,{filename:'apt-map.html'});
 vm.runInContext('updatePins=()=>{}; recompute();',c);
 const rows=JSON.parse(vm.runInContext('JSON.stringify(ORDER.map(d=>({key:d.cxKey,n:d.n,area:d.area,py:d.py,rank:d.rank,sib:d.sib,score:d.score,s4:d.s4,sts:d.g?.sts,pending:d.pending})))',c));
 return {c,rows,missing};
}

