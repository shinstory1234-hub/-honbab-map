#!/usr/bin/env python3
"""Apply source-confirmed FAR only; preserve price, units, year and other price tabs."""
import csv,json,re,subprocess,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def ident(s):
 h=5381
 for c in s: h=((h*33)^ord(c))&0xffffffff
 chars='0123456789abcdefghijklmnopqrstuvwxyz';out=''
 while h:out=chars[h%36]+out;h//=36
 return out or '0'
rows=list(csv.DictReader(open(ROOT/'docs/richgo-under6-full-final-2755-20261118.csv')))
accepted={'verified','verified_prior','verified_second_pass','verified_shared_scope_review'}
corrections={}
for r in rows:
 if r['status'] in accepted and r['richgo_far'] and float(r['richgo_far'])>0:
  corrections[r['name']+'|'+r['area']]={'far':float(r['richgo_far']),'url':r['richgo_url'],'stage':r['stage'],'old':r['map_far'],'scope':r['shared_richgo_page']}
third=ROOT/'docs/richgo-under6-thirdpass-20261118.json'
if third.exists():
 for r in json.load(open(third))['rows']:
  if r['status']=='verified_third_pass' and r['selected']['richgo'].get('far'):
   f=r['selected']['richgo'];corrections[r['key']]={'far':float(f['far']),'url':f['url'],'stage':'thirdpass','old':r['map']['far'],'scope':'no'}
usage=collections.Counter(r['url'] for r in corrections.values())
for r in corrections.values():
 if usage[r['url']]>1:r['scope']='yes'
p=ROOT/'public/apt-univ.js'
s=subprocess.check_output(['git','show','154824bb220c448a6456436e8a3184e41750c7ba:public/apt-univ.js'],cwd=ROOT,text=True)
decoder=json.JSONDecoder()
def array(name):
 m=re.search(r'\b'+name+r'=(\[)',s);a=m.start(1);value,n=decoder.raw_decode(s[a:]);return a,a+n,value
_,_,areas=array('A');start,end,universe=array('R')
applied=set()
prev_lat,prev_lng=3750000,12700000
for r in universe:
 lat,lng=r[6],r[7];r[6],r[7]=lat-prev_lat,lng-prev_lng;prev_lat,prev_lng=lat,lng
 key=r[0]+'|'+areas[r[1]]
 if key not in corrections:continue
 if not isinstance(r[22],list):r[22]=[None]*7
 while len(r[22])<2:r[22].append(None)
 far=corrections[key]['far'];r[22][0]=int(far) if far.is_integer() else far;r[22][1]='R';applied.add(key)
s=s[:start]+json.dumps(universe,ensure_ascii=False,separators=(',',':'))+s[end:]
s=s.replace('for(const r of R){','let prevLat=3750000,prevLng=12700000;for(const r of R){')
s=s.replace('const lat=la/1e5, lng=ln/1e5;','const lat=(prevLat+=la)/1e5, lng=(prevLng+=ln)/1e5;')
# Extend existing under6-only compact override for original manually authored picks.
m=re.search(r'const F="([^"]*)",Y=',s)
if not m:raise RuntimeError('Existing compact correction boundary missing')
override={k[-5:]:v for k,v in (x.split(':') for x in m[1].split(',') if x)}
for key,r in corrections.items():
 if key not in applied:
  f=r['far'];override[ident(key)[-5:]]=str(int(f) if f.is_integer() else f);applied.add(key)
s=s[:m.start(1)]+','.join(k+':'+v for k,v in sorted(override.items()))+s[m.end(1):]
for variable in ('Y','U'):
 m=re.search(r'\b'+variable+r'="([^"]*)"',s)
 if m:s=s[:m.start(1)]+','.join(k[-5:]+':'+v for k,v in (x.split(':') for x in m[1].split(',') if x))+s[m.end(1):]
s=s.replace('return h.toString(36)}','return h.toString(36).slice(-5)}')
# Shortened IDs must remain unique over the frozen complete cohort.
keys=[r['name']+'|'+r['area'] for r in rows]
assert len({ident(k)[-5:] for k in keys})==len(keys),'short hash collision'
p.write_text(s)
subprocess.run(['node','-e',"const fs=require('fs'),t=require('next/dist/compiled/terser');const p='public/apt-univ.js';const r=t.minify_sync(fs.readFileSync(p,'utf8'),{compress:{defaults:true,unsafe:false},mangle:true,format:{comments:false}});fs.writeFileSync(p,r.code+'\\n');"],cwd=ROOT,check=True)
out=[]
for k,r in corrections.items():
 name,area=k.split('|',1);out.append({'name':name,'area':area,'old_far':r['old'],'new_far':r['far'],'source_url':r['url'],'stage':r['stage'],'shared_scope':r['scope']})
dest=ROOT/'docs/richgo-under6-applied-far-20261118.csv'
with open(dest,'w') as f:
 w=csv.DictWriter(f,fieldnames=list(out[0]),lineterminator="\n");w.writeheader();w.writerows(out)
print(json.dumps({'sourceConfirmedFar':len(corrections),'applied':len(applied),'universe':len(universe),'manualOverrides':len(override),'changedFromAuditBaseline':sum(str(r['old']) not in (str(r['far']),str(int(r['far']))) for r in corrections.values())}))
