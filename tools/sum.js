const X=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8'));const A={},B={};X.A.r.forEach(d=>A[d.k]=d);X.B.r.forEach(d=>B[d.k]=d);
const ok=d=>d&&d.score!=null&&!isNaN(d.score);const ks=Object.keys(A).filter(k=>ok(A[k])&&ok(B[k]));
const rank=(M)=>{const s=[...ks].sort((a,b)=>M[b].score-M[a].score);const r={};s.forEach((k,i)=>r[k]=i+1);return [s,r]};
const [sa,ra]=rank(A),[sb,rb]=rank(B);const n=ks.length;let d2=0;ks.forEach(k=>d2+=(ra[k]-rb[k])**2);
console.log('n',n,'spearman',(1-6*d2/(n*(n*n-1))).toFixed(3),'top1',B[sb[0]].score.toFixed(1));
const med=a=>{a=a.slice().sort((x,y)=>x-y);return a[a.length>>1]};
for(const [L,M,s] of [['A',A,sa],['B',B,sb]]){const R=ks.filter(k=>M[k].rb).map(k=>M[k].up),G=ks.filter(k=>!M[k].rb).map(k=>M[k].up);
 console.log(L,'medUp rb',(med(R)*100).toFixed(1),'gen',(med(G)*100).toFixed(1),'top30rb',s.slice(0,30).filter(k=>M[k].rb).length);}
sb.slice(0,30).forEach(k=>console.log(rb[k],'('+ra[k]+')',B[k].score.toFixed(1),'up',(B[k].up*100).toFixed(0)+'%','(전',(A[k].up*100).toFixed(0)+')','conf',B[k].conf.toFixed(2),k.split('|')[0],B[k].rb?'RB':''));
for(const q of ['평촌어바인','평촌센텀','정릉대우','서동탄역더샵','롯데캐슬피렌체','월계동 초안1']){const k=ks.find(k=>k.includes(q));if(k)console.log('#',q,rb[k],'('+ra[k]+')',B[k].score.toFixed(1),'loc',B[k].loc,'T',(B[k].T||0).toFixed(1),'A',(B[k].A||0).toFixed(1),'up',(B[k].up*100).toFixed(0),JSON.stringify(B[k].mp));}
