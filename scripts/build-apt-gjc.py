import json, math, numpy as np
from collections import defaultdict
tr=json.load(open('tr.json')); geo=json.load(open('geo.json'))
# 회귀: ln ppm ~ 연도 + 연식 구간 + ln 면적 + (27년+)×ln 면적, 거래 건수 가중
rows=[]
for sgg,dong,name,yb,ab,by,n,ppm in tr:
    if not ppm or ppm<=0 or not by or by<1960 or not ab: continue
    age=yb-by
    if age<-3: continue
    rows.append((sgg,dong,name,yb,ab,max(0,age),n,math.log(ppm)))
YRS=[2017,2020,2023,2026]; AGEB=[0,5,10,15,20,25,30,35]
def feat(yb,ab,age):
    f=[1.0]+[1.0 if yb==y else 0.0 for y in YRS[1:]]
    b=max(i for i,a in enumerate(AGEB) if age>=a); f+=[1.0 if b==i else 0.0 for i in range(1,len(AGEB))]
    la=math.log(ab/60); f+=[la, la*(1.0 if age>=27 else 0.0)]
    return f
X=np.array([feat(r[3],r[4],r[5]) for r in rows]); y=np.array([r[7] for r in rows]); w=np.sqrt(np.array([r[6] for r in rows],float))
beta=np.linalg.lstsq(X*w[:,None],y*w,rcond=None)[0]
res=y-X@beta
print('R2',1-np.sum(w*res**2)/np.sum(w*(y-np.average(y,weights=w))**2))
# 단지·연도별 잔차(거래 가중)
cy=defaultdict(lambda:[0.0,0.0])
for r,e in zip(rows,res):
    k=(r[0],r[1],r[2],r[3]); cy[k][0]+=r[6]*e; cy[k][1]+=r[6]
G={(g[0],g[1],g[2]):(g[3],g[4],g[5] or 300) for g in geo}
pts=defaultdict(list)   # year -> list of (lat,lng,res,wt)
for (s,d,n,yb),(a,b) in cy.items():
    g=G.get((s,d,n))
    if g and b>0: pts[yb].append((g[0],g[1],a/b,min(b,30),s))
# 시·구 평균(사전값)
sg=defaultdict(lambda:[0.0,0.0])
for yb,L in pts.items():
    for la,ln,e,wt,s in L: sg[(s,yb)][0]+=wt*e; sg[(s,yb)][1]+=wt
BW=450.0; K=2.0
arr={yb:np.array([(p[0],p[1],p[2],p[3]) for p in L]) for yb,L in pts.items()}
out={}
for (s,d,n),(la,ln,hh) in G.items():
    vals=[]
    for yb in YRS:
        A=arr.get(yb)
        if A is None: continue
        dy=(A[:,0]-la)*111000; dx=(A[:,1]-ln)*111000*math.cos(math.radians(la))
        dist=np.hypot(dx,dy); m=dist<1500
        if not m.any(): continue
        wk=np.exp(-0.5*(dist[m]/BW)**2)*np.sqrt(A[m,3])
        pr=sg.get((s,yb)); prior=pr[0]/pr[1] if pr and pr[1] else 0.0
        vals.append((np.sum(wk*A[m,2])+K*prior)/(np.sum(wk)+K))
    if len(vals)>=2: out[(s,d,n)]=float(np.mean(vals))
v=np.array(list(out.values())); med=np.median(v)
out={k:x-med for k,x in out.items()}
print('complexes',len(out),'quantiles',np.percentile(list(out.values()),[1,25,50,75,99]).round(3))
json.dump({'|'.join(k):round(x,4) for k,x in out.items()},open('gjc.json','w'),ensure_ascii=False)
