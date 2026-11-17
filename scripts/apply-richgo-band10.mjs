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
    const q=findClosingArray(code,p),r=JSON.parse(code.slice(p,q));
    if(r[0]!==change.name||r[1]!==a||!Array.isArray(r.at(-1)))throw new Error('Tuple mismatch '+needle);
    if(Number.isInteger(change.year))r[4]=change.year;
    if(Number.isInteger(change.units)&&change.units>0)r[5]=change.units;
    if(Number.isFinite(change.far)&&change.far>=60&&change.far<=1500){r.at(-1)[0]=change.far;r.at(-1)[1]='리치고';}
    code=code.slice(0,p)+JSON.stringify(r)+code.slice(q);updated++;
  }
  if(updated!==fixes.length)throw new Error('Richgo cap10 count mismatch');
  return code;
}
