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
  const rows=fixes.map(x=>[x.name+'|'+x.area,x.far??null,x.year??null,x.units??null]);
  const post=[
    ';(function(W){',
    'if(W.CAPT!==10)return;',
    'const X='+JSON.stringify(rows)+',D=new Map((W.PICKS||[]).map(d=>[d.n+"|"+d.area,d]));',
    'for(const [k,far,year,units] of X){',
    'if(far!=null){',
    'const f=(W.FARD||{})[k];if(f){f[0]=far;f[1]="리치고";}',
    'const p=(W.PLAT||{})[k];if(p&&p.length>2)p[2]=far;',
    '}',
    'if(year!=null||units!=null){const d=D.get(k);if(d){',
    'if(year!=null)d.year=year;',
    'if(units!=null){d.units=units;',
    'const uf=(W.UNITFIX||{})[k];if(uf)uf[0]=units;',
    'const um=(W.UNITFIX_M3||{})[k];if(um)um[0]=units;',
    '}',
    '}}',
    '}',
    'W.RICHGO10_FINAL={checked:X.length};',
    '})(window);'
  ].join('\n');
  return code+'\n'+post;
}
