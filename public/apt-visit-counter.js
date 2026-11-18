(function(){
var e=document.getElementById('aptVisitors'),v=Math.random().toString(36).slice(2),k='aptVisitSnap',d=Math.floor((Date.now()+32400000)/86400000),p;
function show(t,a){e.textContent='방문 오늘 '+t+' · 누적 '+a}
try{p=JSON.parse(localStorage.getItem(k));if(p&&p.a>=600){if(p.d===d)show(p.t,p.a);else e.textContent='방문 오늘 집계 중 · 누적 '+p.a}v=localStorage.aptVid||(localStorage.aptVid=v)}catch(x){}
fetch('/api/apt-visit',{method:'POST',body:JSON.stringify({v})}).then(r=>r.json()).then(j=>{if(j.t>=0&&j.a>=600){show(j.t,j.a);try{localStorage.setItem(k,JSON.stringify({t:j.t,a:j.a,d}))}catch(x){}}}).catch(()=>{});
})();
