#!/usr/bin/env python3
"""Independent, read-only Richgo versus apartment-map audit on an isolated branch.
Visits only explicitly selected 300 map apartments. No production writes.
"""
import csv, json, os, re, subprocess, urllib.parse, time, sys, gzip, base64
from difflib import SequenceMatcher
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter, defaultdict
import requests
import threading
import html as html_mod
from bs4 import BeautifulSoup

BRANCH='audit/richgo-25to30-top300-20261118'
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT='docs/richgo-25to30-direct-audit-20261118.csv'
# Current exact cap30 ranking is supplied by scripts/export-richgo-25to30-targets.mjs.
# If the live snapshot is unavailable, audit ALL 25~30억 static candidates,
# explicitly mark that these are NOT confirmed current ranking positions.
def static_fallback():
    js=r"""
const fs=require('fs'),s=fs.readFileSync('public/apt-univ30.js','utf8');
const a=JSON.parse(s.slice(s.indexOf('const A=')+8,s.indexOf(',S=[')));
const p=s.indexOf('R=['),r=JSON.parse(s.slice(p+2,s.indexOf(';'+String.fromCharCode(10)+'const TB',p)));
const selected=r.filter(q=>q[8].some((v,i)=>i%4===1&&v>250000&&v<=300000));
process.stdout.write(JSON.stringify({total:selected.length,rows:selected.map((q,i)=>({
 rank:null,name:q[0],area:a[q[1]],year:q[4],units:q[5],py:q[2],price:q[3],
 far:q.at(-1)[0],far_source:q.at(-1)[1],key:q[0]+'|'+a[q[1]]
}))}));
"""
    o=subprocess.check_output(['node','-e',js],cwd=ROOT,text=True)
    return json.loads(o)
try:
    with open('/tmp/richgo25to30-rank-targets.json',encoding='utf-8') as f:
        base=json.load(f)
    source_kind='exact-rank-bt-livecur-20261118'
except (OSError,ValueError):
    try:
        with open('docs/richgo25to30-fallback-targets-20261118.json',encoding='utf-8') as f:
            base=json.load(f)
        source_kind='map-complexes-from-static-and-20261118-bt_livecur-not-ranked'
    except (OSError,ValueError):
        base=static_fallback()
        source_kind='static-band-candidates-not-a-current-ranking'
targets=[dict(seq=i+1,rank=r.get('rank'),name=r['name'],area=r['area'],
              year=r['year'],units=r['units'],py=r['py'],price=r['price'],
              far=r.get('far'),far_source=r.get('far_source','')) for i,r in enumerate(base['rows'])]
assert len(targets)>0 and len(targets)<=300
assert len({(t['name'],t['area']) for t in targets})==len(targets)
print('TARGET_COHORT',json.dumps({'selected':len(targets),'total_visible':base.get('total'),'source_kind':source_kind},ensure_ascii=False),flush=True)

def norm(s):
    return ''.join(re.findall(r'[가-힣A-Za-z0-9]+',str(s))).lower()
def shortnorm(s):
    s=norm(s)
    for p in ('안양','군포','서울','수원','성남','부천','상계동','중계동','관양동','방화동','송도동','화서동','호매실동','산본동','신림동','창동'):
        if s.startswith(p) and len(s)>len(p)+3:s=s[len(p):]
    s=s.replace('아파트','').replace('단지아파트','단지')
    return s

def region_of(a):
    part=a.split();city=part[0]
    if city in ('서울','인천'):return city,part[1],part[-1]
    if len(part)>2 and part[1].endswith('구'):
        city2=city if city.endswith('시') else city+'시'
        return '경기',city2+' '+part[1],part[-1]
    return '경기',city,part[-1]

hubs=defaultdict(list)
for t in targets:
    sd,sgg,dong=region_of(t['area'])
    hubs[(sd,sgg)].append(t)
print('AUDIT_INIT',json.dumps({'target':len(targets),'regions':len(hubs)},ensure_ascii=False),flush=True)
RATE_LOCK=threading.Lock()
LAST_CALL=[0.0]
HEADERS={'User-Agent':'Mozilla/5.0 (compatible; ApartmentMap-DataQA/1.0; personal-audit)','Accept-Language':'ko-KR,ko;q=0.9'}
def fetch(url):
    try:
        with RATE_LOCK:
            gap=time.monotonic()-LAST_CALL[0]
            if gap<0.35:time.sleep(0.35-gap)
            LAST_CALL[0]=time.monotonic()
        r=requests.get(url,headers=HEADERS,timeout=22,allow_redirects=True)
        if r.status_code==200 and len(r.content)>500:return r.text
        return None
    except requests.RequestException:
        return None

segments=['','30평대','40평대','대단지','역세권','재건축','신축','10억-20억','주차여유','20평대','50평대','리모델링']
# Request hub categories sequentially per district, but parallelize independent districts.
def fetch_hub(group):
    sd,sgg=group
    base='https://m.richgo.ai/realty/apt-hub/'+urllib.parse.quote(sd)+'/'+urllib.parse.quote(sgg)
    found={}
    mine=hubs[group]
    remaining={t['seq']:t for t in mine}
    for seg in segments:
        if not remaining:break
        url=base+('/'+urllib.parse.quote(seg) if seg else '')
        html=fetch(url)
        if not html:continue
        soup=BeautifulSoup(html,'html.parser')
        candidates=[]
        for tag in soup.find_all('a',href=True):
            h=tag.get('href','')
            m=re.search(r'/realty/danji/([A-Za-z0-9]{7})',h)
            if not m:continue
            label=re.sub(r'^\s*\d+\.\s*','',tag.get_text(' ',strip=True))
            if label:
                tr=tag.find_parent('tr')
                context=tr.get_text(' ',strip=True) if tr else ''
                units_search=re.search(r'([\\d,]+)\\s*세대',context)
                candidates.append((label,m.group(1),context,int(units_search.group(1).replace(',','')) if units_search else None))
        for seq,t in list(remaining.items()):
            n=shortnorm(t['name']); matches=[]
            for label,danjiid,context,cunits in candidates:
                x=shortnorm(label)
                # Require close complex name, no substring matches between 1 and 11 complexes.
                sim=SequenceMatcher(None,n,x).ratio()
                if n==x:score=100
                elif len(n)>5 and n in x[:len(n)+3] and sim>.84:score=93
                elif sim>.91:score=90
                elif cunits==t['units'] and t['area'].split()[-1] in context and sim>.48:score=85
                else: continue
                matches.append((score,danjiid,label))
            if matches:
                matches.sort(reverse=True)
                if len({x[1] for x in matches if x[0]==matches[0][0]})==1:
                    found[seq]=matches[0][1:]
                    remaining.pop(seq,None)
    return found

idmap={}
with ThreadPoolExecutor(max_workers=5) as ex:
    tasks={ex.submit(fetch_hub,g):g for g in hubs}
    for fut in as_completed(tasks):
        try:idmap.update(fut.result())
        except Exception as e:print('HUB_FAIL',tasks[fut],str(e)[:200],flush=True)
print('HUB_MATCH',len(idmap),'of',len(targets),flush=True)
# Previously hand-verified URLs for difficult name variants; match the same frozen cohort.
# Re-use already captured public Richgo URLs, but re-open and validate every page.
known={}
for fn in ('docs/richgo-25to30-audit-20261118.csv','docs/apt-far-richgo-252-compact-2026-11-16.csv'):
    try:
        with open(os.path.join(ROOT,fn),encoding='utf-8-sig',newline='') as f:
            for row in csv.DictReader(f):
                name=row.get('name') or row.get('단지명')
                area=row.get('area') or row.get('지역')
                url=row.get('source_url')
                if not url and row.get('리치고단지ID'):
                    url='https://m.richgo.ai/realty/danji/'+row['리치고단지ID']
                mat=re.search(r'/realty/danji/([A-Za-z0-9]{7})',url or '')
                if name and area and mat:known[name+'|'+area]=mat.group(1)
    except OSError:pass
for t in targets:
    id0=known.get(t['name']+'|'+t['area'])
    if id0:idmap[t['seq']]=(id0,t['name'])
print('PREVIOUSLY_KNOWN_IDS',len(idmap),flush=True)

# Public search index fallback for apartments outside the first 60 hub results.
# Read only; URLs must be Richgo complex pages, with subsequent strict identity checks.
def public_index_lookup(t):
    terms='site:m.richgo.ai/realty/danji/ "'+t['name']+'" "'+t['area'].split()[-1]+'"'
    engines=[
        'https://www.bing.com/search?format=rss&q='+urllib.parse.quote(terms),
        'https://www.google.com/search?q='+urllib.parse.quote(terms)+'&num=5',
    ]
    for u in engines:
        page=fetch(u)
        if not page:continue
        ids=re.findall(r'(?:https?[:/]+(?:m[.]richgo[.]ai|www[.]richgo[.]ai)|m[.]richgo[.]ai)(?:/|%2F)+realty(?:/|%2F)+danji(?:/|%2F)+([a-zA-Z0-9]{7})',html_mod.unescape(page),re.I)
        if ids:return ids[0]
        # Some search engines URL-encode redirect links and parameters.
        ids=re.findall(r'm[.]richgo[.]ai(?:%2F|/)+realty(?:%2F|/)+danji(?:%2F|/)+([a-zA-Z0-9]{7})',page,re.I)
        if ids:return ids[0]
    return None
unmatched=[t for t in targets if t['seq'] not in idmap]
search_hits=0
with ThreadPoolExecutor(max_workers=5) as ex:
    tasks={ex.submit(public_index_lookup,t):t for t in unmatched}
    for fut in as_completed(tasks):
        t=tasks[fut]
        try:
            found=fut.result()
            if found:
                idmap[t['seq']]=(found,t['name']);search_hits+=1
        except Exception:pass
print('SEARCH_INDEX_MATCH',search_hits,'TOTAL_IDS',len(idmap),flush=True)

def grab_tokens(soup):
    return [x.strip() for x in soup.stripped_strings if str(x).strip()]
def parse_section(toks):
    start=next((i for i,x in enumerate(toks) if x.endswith('단지 정보')),None)
    if start is None:start=next((i for i,x in enumerate(toks) if x=='세대수'),None)
    return toks[start:start+80] if start is not None else []
def label_val(toks,term):
    for i,v in enumerate(toks):
        if v==term and i+1<len(toks):return toks[i+1]
    return None
def parse_money(s):
    if not s:return None
    s=str(s).replace(',','')
    e=re.search(r'(\d+)\s*억',s)
    m=re.search(r'(\d+)\s*만',s)
    if not e and not m:return None
    return (int(e.group(1))*10000 if e else 0)+(int(m.group(1)) if m else 0)

def parse_detail(t):
    seq=t['seq']
    if seq not in idmap:return {'status':'미매칭'}
    danjiid,hub_label=idmap[seq]
    url='https://m.richgo.ai/realty/danji/'+danjiid
    html=fetch(url)
    if not html:return {'status':'원문 조회 실패','url':url}
    soup=BeautifulSoup(html,'html.parser')
    toks=grab_tokens(soup);info=parse_section(toks)
    h1=soup.find('h1');title=h1.get_text(' ',strip=True) if h1 else ''
    yr=label_val(info,'입주');unit=label_val(info,'세대수');far=label_val(info,'용적률')
    parking=label_val(info,'주차');pys=label_val(info,'평형');floors=label_val(info,'층수');heating=label_val(info,'난방');builder=label_val(info,'시공사');coverage=label_val(info,'건폐율')
    yy=re.search(r'((?:19|20)\d{2})',yr or '')
    uu=re.search(r'([\d,]+)\s*세대',unit or '')
    ff=re.search(r'(\d{2,4}(?:\.\d+)?)\s*%',far or '')
    rr=re.search(r'\d+(?:\s*[·,]\s*\d+)*\s*평',pys or '')
    rpy=[int(x) for x in re.findall(r'\d+',rr.group(0))] if rr else []
    sale=None;jeonse=None
    for table in soup.find_all('table'):
        head=table.get_text(' ',strip=True)
        if '매매 시세' not in head or '전세 시세' not in head:continue
        for tr in table.find_all('tr'):
            cells=[c.get_text(' ',strip=True) for c in tr.find_all(['th','td'])]
            if len(cells)<3:continue
            py_match=re.search(r'(\d+)\s*평',cells[0])
            if py_match and int(py_match.group(1))==t['py']:
                sale=parse_money(cells[1]);jeonse=parse_money(cells[2]);break
        if sale is not None:break
    if sale is None:
        i=next((j for j,x in enumerate(toks) if x=='평형별 시세'),None)
        if i is not None:
            for k in range(i+1,min(i+85,len(toks)-2)):
                if toks[k]==str(t['py'])+'평':
                    sale=parse_money(toks[k+1]);jeonse=parse_money(toks[k+2]);break
    rich_year=int(yy.group(1)) if yy else None
    rich_units=int(uu.group(1).replace(',','')) if uu else None
    rich_far=float(ff.group(1)) if ff else None
    if rich_far is not None and rich_far.is_integer():rich_far=int(rich_far)
    # A nearby matching apartment on a similarly-named hub can be a false positive.
    dom=t['area'].split()[-1]
    detail_first=' '.join(toks[:45])
    name_ok=(shortnorm(t['name']) in shortnorm(title)) or (SequenceMatcher(None,shortnorm(t['name']),shortnorm(hub_label)).ratio()>.91)
    dong_ok=dom in title or dom in detail_first or dom.endswith('읍') or dom.endswith('동') and dom in url # best effort
    if rich_units is not None and t['units']!=rich_units and abs(rich_units-t['units'])/max(rich_units,t['units'])>.15: name_ok=False
    status='직접대조' if name_ok and (dom in title or dom in detail_first) and rich_units is not None and rich_year is not None else '동일단지 추가확인'
    return {'status':status,'url':url,'richgo_name':hub_label,'richgo_year':rich_year,
            'richgo_units':rich_units,'richgo_far':rich_far,'richgo_pyeongs':','.join(map(str,rpy)),
            'richgo_sale':sale,'richgo_jeonse':jeonse,'richgo_parking':parking,'richgo_floors':floors,'richgo_heating':heating,'richgo_builder':builder,'richgo_coverage':coverage,'title':title}

results={}
with ThreadPoolExecutor(max_workers=5) as ex:
    tasks={ex.submit(parse_detail,t):t['seq'] for t in targets}
    for fut in as_completed(tasks):
        seq=tasks[fut]
        try: results[seq]=fut.result()
        except Exception as e:results[seq]={'status':'파싱 실패','error':str(e)[:250]}
columns=['seq','snapshot_rank','name','area','map_year','richgo_year','year_match',
         'map_units','richgo_units','units_match','map_py','richgo_pyeongs','pyeong_present',
         'map_far','map_far_source','richgo_far','far_delta_pp','map_reference_price_manwon',
         'richgo_same_py_sale_manwon','richgo_same_py_jeonse_manwon','price_basis',
         'richgo_parking','richgo_floors','richgo_heating','richgo_builder','richgo_coverage','status','source_url']
counts=Counter()
with open(OUT,'w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=columns);w.writeheader()
    for t in targets:
        r=results[t['seq']];counts[r['status']]+=1
        yn=r.get('richgo_year');un=r.get('richgo_units');ff=r.get('richgo_far')
        py=r.get('richgo_pyeongs','')
        pylist=[int(x) for x in py.split(',') if x]
        w.writerow(dict(seq=t['seq'],snapshot_rank=t['rank'],name=t['name'],area=t['area'],
          map_year=t['year'],richgo_year=yn,year_match='' if yn is None else yn==t['year'],
          map_units=t['units'],richgo_units=un,units_match='' if un is None else un==t['units'],
          map_py=t['py'],richgo_pyeongs=py,pyeong_present='' if not pylist else t['py'] in pylist,
          map_far=t['far'],map_far_source=t['far_source'],richgo_far=ff,
          far_delta_pp='' if ff is None or t['far'] is None else ff-t['far'],
          map_reference_price_manwon=t['price'],richgo_same_py_sale_manwon=r.get('richgo_sale'),
          richgo_same_py_jeonse_manwon=r.get('richgo_jeonse'),
          price_basis='맵 거래중위 / 리치고 추정시세 — 수치 차이를 오류로 단정하지 않음',
          richgo_parking=r.get('richgo_parking'),richgo_floors=r.get('richgo_floors'),richgo_heating=r.get('richgo_heating'),richgo_builder=r.get('richgo_builder'),richgo_coverage=r.get('richgo_coverage'),status=r['status'],source_url=r.get('url')))
summary={'targets':len(targets),'source_kind':source_kind,'source_visible':base.get('total'),
    'hub_match':len(idmap),'statuses':dict(counts),'direct_comparison':counts['직접대조'],
    'file':OUT}
with open('docs/richgo-25to30-direct-summary-20261118.json','w',encoding='utf-8') as f:
    json.dump(summary,f,ensure_ascii=False,indent=2)
print('AUDIT_SUMMARY '+json.dumps(summary,ensure_ascii=False),flush=True)
