#!/usr/bin/env python3
"""Resume unresolved cohort using additional public hub segments and actual detail facts."""
import csv, json, re, glob, math, time, html, urllib.request, urllib.parse, os, threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from difflib import SequenceMatcher
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/richgo-under6-thirdpass-20261118.json'
CACHE=Path('/tmp/richgo-under6-third-cache'); CACHE.mkdir(exist_ok=True)
blocked_search=0
def clean(s): return html.unescape(re.sub('<[^>]+>','',s)).strip()
def norm(s): return re.sub('[^가-힣a-z0-9]','',re.sub('아파트|주상복합|단지','',s.lower()))
def sim(a,b): return SequenceMatcher(None,norm(a),norm(b)).ratio()
def number(s):
 m=re.search(r'[\d,]+(?:\.\d+)?',s)
 return float(m[0].replace(',','')) if m else None
def get(url):
 global blocked_search
 import hashlib
 p=CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.html')
 if p.exists(): return p.read_text()
 for attempt in range(2):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ChatGPT-User'}),timeout=20) as r: s=r.read().decode()
   p.write_text(s); return s
  except urllib.error.HTTPError as e:
   if e.code in (401,403,429):
    if 'bing.com' in url:blocked_search+=1
    return ''
  except Exception: pass
  time.sleep(.7)
 return ''
def pool(items,fn):
 out=[]
 with ThreadPoolExecutor(max_workers=5) as ex:
  jobs={ex.submit(fn,x):x for x in items}
  for i,f in enumerate(as_completed(jobs)):
   out.append(f.result())
   if (i+1)%40==0: print('PROGRESS',i+1,'/',len(items),flush=True)
 return out
base={r['key']:r for p in glob.glob(str(ROOT/'docs/richgo-under6-full-parts/*.json')) for r in json.load(open(p))['rows']}
pending=list(csv.DictReader(open(ROOT/'docs/richgo-under6-full-still-unresolved-20261118.csv')))
targets=[base[r['name']+'|'+r['area']] for r in pending]
def region(t):
 a=t['area'].split(); sd=a[0] if a[0] in ('서울','인천') else '경기'
 sg=a[1] if sd!='경기' else a[0].removesuffix('시')+'시'+(' '+a[1] if a[1].endswith('구') else '')
 return sd,sg
segments=['','초품아','주차여유','전세가율70이상']
jobs=set()
for t in targets:
 sd,sg=region(t)
 variants=[sg]
 if sd=='인천':
  if sg in ('서해구','검단구'): variants+=['서구']
  if sg=='영종구': variants+=['중구']
  if sg=='제물포구': variants+=['동구','중구']
 if sd=='경기' and sg.startswith('화성시 '): variants+=['화성시']
 for sgg in variants:
  for segment in segments: jobs.add((sd,sg,sgg,segment))
def hub(job):
 sd,sg,variant,segment=job
 url='https://m.richgo.ai/realty/apt-hub/'+urllib.parse.quote(sd+'/'+variant+('/'+segment if segment else ''),safe='/')
 s=get(url); rows=[]
 for tr in re.findall(r'<tr\b[^>]*>[\s\S]*?</tr>',s):
  m=re.search(r'<a[^>]+href="/realty/danji/(a[A-Za-z0-9]{6})[^\"]*"[^>]*>([\s\S]*?)</a>',tr)
  if not m: continue
  extra=clean(tr); dong=re.search(r'([가-힣0-9]+(?:동|가|읍|면|리))\s*·',extra)
  rows.append({'id':m[1],'name':re.sub(r'^\d+\.\s*','',clean(m[2])),'dong':dong[1] if dong else ''})
 return (sd,sg),rows
print('HUB_JOBS',len(jobs),'TARGETS',len(targets),flush=True)
hubs={}
for k,rows in pool(sorted(jobs),hub):
 h=hubs.setdefault(k,{})
 for r in rows: h[r['id']]=r
existing={}
for p in glob.glob(str(ROOT/'docs/richgo-under6-*parts/*.json')):
 for r in json.load(open(p))['rows']:
  f=r.get('richgo')
  if f and f.get('id') and f.get('lat') and f.get('name'): existing[f['id']]=f
candidate={}; ids=set()
for t in targets:
 dong=t['area'].split()[-1]; name=t['name'].removeprefix(dong).strip(); choices=[]
 for c in hubs.get(region(t),{}).values():
  similarity=sim(name,c['name'])
  if c['dong']==dong and similarity>=.38 or similarity>=.78:
   choices.append((similarity+(0.4 if c['dong']==dong else 0),c['id']))
 selected=[cid for _,cid in sorted(choices,reverse=True)[:5]]
 selected+= [c['id'] for c in t.get('candidates',[]) if c.get('id')]
 candidate[t['key']]=list(set(selected));ids.update(selected)
if os.environ.get('INDEX_SEARCH')=='1':
 previous=json.load(open(OUT)) if OUT.exists() else {'rows':[]}
 resolved={r['key'] for r in previous['rows'] if r.get('selected')}
 search_targets=[t for t in targets if t['key'] not in resolved]
 def indexed(t):
  if blocked_search>=5:return t['key'],[]
  dong=t['area'].split()[-1];name=t['name'].removeprefix(dong).strip()
  query='site:m.richgo.ai/realty/danji/ '+name+' '+dong
  s=get('https://www.bing.com/search?format=rss&q='+urllib.parse.quote(query))
  found=list(dict.fromkeys(re.findall(r'(?:https?://)?(?:m\.)?richgo\.ai/realty/danji/(a[A-Za-z0-9]{6})',html.unescape(s))))
  return t['key'],found[:4]
 print('INDEX_JOBS',len(search_targets),flush=True)
 for key,found in pool(search_targets,indexed):
  candidate[key]=list(set(candidate[key]+found));ids.update(found)
 print('INDEX_BLOCKED',blocked_search,flush=True)
def detail(cid):
 if cid in existing: return cid,existing[cid]
 s=get('https://m.richgo.ai/realty/danji/'+cid)
 m=re.search(r'<dl class="facts">([\s\S]*?)</dl>',s)
 if not m: return cid,None
 facts={clean(k):clean(v) for k,v in re.findall(r'<dt[^>]*>([\s\S]*?)</dt>\s*<dd[^>]*>([\s\S]*?)</dd>',m[1])}
 name=re.search(r'<meta name="keywords" content="([^,]+),',s)
 geo=re.search(r'"latitude":([0-9.]+),\s*"longitude":([0-9.]+)',s)
 street=re.search(r'"streetAddress":"([^"]+)"',s);year=re.search(r'(?:19|20)\d{2}',facts.get('입주',''))
 f={'id':cid,'name':clean(name[1]) if name else '', 'far':number(facts.get('용적률','')),'year':int(year[0]) if year else None,'units':number(facts.get('세대수','')),'lat':float(geo[1]) if geo else None,'lng':float(geo[2]) if geo else None,'street':street[1] if street else '', 'url':'https://m.richgo.ai/realty/danji/'+cid}
 return cid,f
print('DETAIL_JOBS',len(ids),flush=True)
facts=dict(pool(sorted(ids),detail));results=[]
for t in targets:
 mp=t['map'];dong=t['area'].split()[-1];tn=t['name'].removeprefix(dong).strip(); matches=[];reviews=[]
 for cid in candidate[t['key']]:
  f=facts.get(cid)
  if not f or not f.get('units') or not f.get('year'): continue
  fn=f['name'].removeprefix(dong).strip();ns=sim(tn,fn)
  yr=abs(mp['year']-int(f['year']));ud=abs(mp['units']-f['units'])/max(mp['units'],f['units'])
  meter=round(math.hypot((mp['lat']-f['lat'])*111100,(mp['lng']-f['lng'])*111100*math.cos(mp['lat']*math.pi/180))) if mp.get('lat') and f.get('lat') else None
  # Require real detail-page name. Never substitute target name as source evidence.
  nums=lambda x:re.findall(r'\d+',norm(x))
  conflict=bool(nums(tn) and nums(fn) and nums(tn)!=nums(fn))
  ok=not conflict and yr<=2 and ud<=.20 and ns>=.65 and meter is not None and meter<=150
  if meter is None: ok=not conflict and yr<=1 and ud<=.025 and ns>=.92 and dong in f.get('street','')
  row={'richgo':f,'distance_m':meter,'name_similarity':round(ns,3),'year_delta':yr,'units_delta':round(ud,4),'number_conflict':conflict,'accepted':ok}
  reviews.append(row)
  if ok: matches.append(row)
 results.append({'key':t['key'],'map':mp,'status':'verified_third_pass' if len(matches)==1 else 'unresolved','selected':matches[0] if len(matches)==1 else None,'candidates':reviews})
out={'meta':{'targets':len(targets),'verified':sum(r['status']=='verified_third_pass' for r in results),'hubs':len(jobs),'details':len(ids),'indexSearch':os.environ.get('INDEX_SEARCH')=='1','blockedSearchRequests':blocked_search},'rows':results}
OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('RESULT',json.dumps(out['meta']),flush=True)
