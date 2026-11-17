import fs from 'node:fs';
import path from 'node:path';
// Build-time, cap=10 only: patch raw tuples rather than shipping a new runtime overlay.
// The audit evidence stays in docs; other tabs never get these corrections.
function findClosingArray(code,start){
  let depth=0,quoted=false,escape=false;
  for(let i=start;i<code.length;i++){
    const c=code[i];
    if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue;}
    if(c==='"'){quoted=true;continue;}
    if(c==='[')depth++;
    if(c===']'&&--depth===0)return i+1;
  }
  throw new Error('Cannot parse a packed apartment tuple');
}
function splitRawArray(raw){
  if(raw[0]!=='['||raw.at(-1)!==']')throw new Error('Expected a packed array');
  let depth=0, quoted=false,escape=false,start=1;const out=[];
  for(let i=1;i<raw.length-1;i++){
    const c=raw[i];
    if(quoted){if(escape)escape=false;else if(c==='\\\\')escape=true;else if(c==='"')quoted=false;continue;}
    if(c==='"'){quoted=true;continue;}
    if(c==='['||c==='{')depth++;
    if(c===']'||c==='}')depth--;
    if(c===','&&depth===0){out.push(raw.slice(start,i));start=i+1;}
  }
  out.push(raw.slice(start,-1));return out;
}
export function patchRichgoCap10Source(code,root){
  const filename=path.join(root,'scripts/richgo-band10-corrections.json');
  const fixes=JSON.parse(fs.readFileSync(filename,'utf8'));
  if(!fixes.length)return code;
  const k=code.indexOf('const A='),start=code.indexOf('[',k),end=findClosingArray(code,start);
  if(k<0||start<0||end<=start)throw new Error('Region lookup missing');
  const areas=JSON.parse(code.slice(start,end));
  let updated=0;
  for(const change of fixes){
    const a=areas.indexOf(change.area);
    if(a<0)throw new Error('Missing area '+change.area);
    const needle='['+JSON.stringify(change.name)+','+a+',';
    const p=code.indexOf(needle,end);
    if(p<0)throw new Error('Missing cap10 complex '+change.name+'|'+change.area);
    const q=findClosingArray(code,p),row=splitRawArray(code.slice(p,q));
    if(JSON.parse(row[0])!==change.name||Number(row[1])!==a)throw new Error('Tuple mismatch '+needle);
    if(Number.isInteger(change.year))row[4]=String(change.year);
    if(Number.isInteger(change.units)&&change.units>0)row[5]=String(change.units);
    if(Number.isFinite(change.far)&&change.far>=60&&change.far<=1500){
      const fd=splitRawArray(row.at(-1));fd[0]=String(change.far);fd[1]='"리치고"';
      row[row.length-1]='['+fd.join(',')+']';
    }
    code=code.slice(0,p)+'['+row.join(',')+']'+code.slice(q);updated++;
  }
  if(updated!==fixes.length)throw new Error('Richgo cap10 count mismatch');
  return code;
}

// The detailed apartment data may be normalized again by subsequent overlays.
// Put Richgo's verified cap10 data last, before the app recomputes scores.
export function appendRichgoCap10FinalOverrides(code,root){
  const filename=path.join(root,'scripts/richgo-band10-corrections.json');
  const fixes=JSON.parse(fs.readFileSync(filename,'utf8'));
  if(!fixes.length)return code;
  const hash=s=>{
    let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
    return (h>>>0).toString(36).padStart(7,'0');
  };
  // Compact each verified change into 16 base36 chars:
  // source-key fingerprint (7) + FAR (3) + year (3) + households (3).
  // Zero is a null sentinel and is never a valid year, FAR or household value.
  const slot=v=>{
    if(v==null)return '000';
    if(!Number.isInteger(v)||v<1||v>=46656)throw new Error('Non-packable cap10 verified value: '+v);
    return v.toString(36).padStart(3,'0');
  };
  // Raw cap10 tuple patch is applied before the other scripts load.
  // The runtime override is needed only for independently maintained PLAT records,
  // scripts that overwrite FARD later, and updated completion year / unit counts.
  // This avoids shipping duplicate values for 1110 unaffected apartments.
  const platText=fs.readFileSync(path.join(root,'public/apt-plat.js'),'utf8');
  const platStart=platText.indexOf('window.PLAT=');
  if(platStart<0)throw new Error('Cannot inspect PLAT source');
  const platCode=platText.slice(platStart+'window.PLAT='.length);
  const platEnd=platCode.indexOf('};');
  if(platEnd<0)throw new Error('PLAT source not terminated');
  const plat=JSON.parse(platCode.slice(0,platEnd+1));
  const farfixText=fs.readFileSync(path.join(root,'public/apt-farfix.js'),'utf8');
  const s4Text=fs.readFileSync(path.join(root,'public/apt-s4.js'),'utf8');
  const override=fixes.filter(x=>{
    const k=x.name+'|'+x.area;
    return Object.hasOwn(plat,k)||farfixText.includes(JSON.stringify(k)+':')||
      s4Text.includes("'"+k+"':")||x.year!=null||x.units!=null;
  });
  const ids=override.map(x=>hash(x.name+'|'+x.area));
  if(new Set(ids).size!==ids.length)throw new Error('Cap10 source hash collision');
  const packed=override.map((x,i)=>ids[i]+slot(x.far)+slot(x.year)+slot(x.units)).join('');
  if(packed.length!==override.length*16)throw new Error('Cap10 packed length mismatch');
  const post=[
    ';(function(W){',
    'if(W.CAPT!==10)return;',
    'const P='+JSON.stringify(packed)+',H=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(36).padStart(7,"0");},D=new Map();',
    'for(const d of W.PICKS||[]){const h=H(d.n+"|"+d.area);if(D.has(h)&&D.get(h)!==d)throw Error("Cap10 source hash collision");D.set(h,d);}',
    'for(let i=0;i<P.length;i+=16){',
    'const h=P.slice(i,i+7),far=parseInt(P.slice(i+7,i+10),36)||null,year=parseInt(P.slice(i+10,i+13),36)||null,units=parseInt(P.slice(i+13,i+16),36)||null;',
    'const d=D.get(h);if(!d)throw Error("Missing verified cap10 apartment "+h);const k=d.n+"|"+d.area;',
    'if(far!=null){const f=(W.FARD||{})[k];if(f){f[0]=far;f[1]="리치고";}const p=(W.PLAT||{})[k];if(p&&p.length>2)p[2]=far;}',
    'if(year!=null)d.year=year;',
    'if(units!=null){d.units=units;const uf=(W.UNITFIX||{})[k];if(uf)uf[0]=units;const um=(W.UNITFIX_M3||{})[k];if(um)um[0]=units;}',
    '}',
    'W.RICHGO10_FINAL={checked:'+fixes.length+',overlaid:P.length/16};',
    '})(window);'
  ].join('\n');
  return code+'\n'+post;
}
