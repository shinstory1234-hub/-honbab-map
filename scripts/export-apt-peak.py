import pathlib,json,urllib.request,urllib.error,time,concurrent.futures,sys,tempfile
from urllib.parse import urlencode
# Usage: python scripts/export-apt-peak.py TOKEN_FILE OUTPUT_JSON
# Only credential file paths, never token values, belong on the command line.
if len(sys.argv)!=3:raise SystemExit('Usage: export-apt-peak.py TOKEN_FILE OUTPUT_JSON')
output=pathlib.Path(sys.argv[2]); output.parent.mkdir(parents=True,exist_ok=True)
cache=pathlib.Path(tempfile.mkdtemp(prefix='apt-peak-pages-',dir=output.parent))
token=pathlib.Path(sys.argv[1]).read_text().strip()
base='https://realestate-media.vercel.app/api/backtest/collect'
def call(params):
 for attempt in range(3):
  try:
   with urllib.request.urlopen(base+'?'+urlencode({**params,'t':token}),timeout=65) as r:
    j=json.load(r)
   return j
  except Exception:
   if attempt==2:raise RuntimeError('Peak export request failed (details redacted)') from None
   time.sleep(2*(attempt+1))
status=call({'mode':'status'})
if not status.get('ready'):raise SystemExit('Collection is incomplete')
def page(offset):
 p=cache/f'{offset}.json'
 if p.exists():return json.loads(p.read_text())
 j=call({'mode':'peak','basis':'round','offset':str(offset)})
 if j.get('areaBasis')!='round' or j.get('offset')!=offset or 'bands' not in j:raise RuntimeError('Invalid peak page')
 j['bands'].sort(key=lambda b:(b['sgg'],b['dong'],b['name'],b['ab']))
 p.write_text(json.dumps(j,ensure_ascii=False));return j
first=page(0);total=first['total'];pages=[first]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for i,j in enumerate(pool.map(page,range(50,total,50)),start=2):
  pages.append(j)
  if i%50==0:print(f'pages={i}, bands_scanned={sum(p["scanned"] for p in pages)}/{total}',flush=True)
final=call({'mode':'status'})
if not final.get('ready') or final['rows']!=status['rows']:raise RuntimeError('Collection changed during export')
output.write_text(json.dumps({'status':status,'pages':sorted(pages,key=lambda p:p['offset'])},ensure_ascii=False))
print(f'COMPLETE pages={len(pages)}, scanned={total}, eligible_bands={sum(len(p["bands"]) for p in pages)}',flush=True)
