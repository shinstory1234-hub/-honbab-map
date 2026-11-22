(function(){
'use strict';
const fmt=new Intl.NumberFormat('ko-KR');
const $=id=>document.getElementById(id);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatMoney=v=>{const n=Number(v)||0,a=Math.floor(n/10000),b=Math.round(n%10000);return a?(a+'억'+(b?' '+fmt.format(b)+'만원':'')):fmt.format(b)+'만원'};
const shortMoney=v=>(Number(v)/10000).toFixed(2)+'억';
const flag=(r,n)=>(r[18]&n)!==0;
const delta=r=>r[1]-r[0];
const region=r=>r[3].startsWith('서울')?'서울':r[3].startsWith('인천')?'인천':'경기';
const pc=v=>(Number(v)>0?'+':'')+Number(v).toFixed(1)+'%';
const data={rows:[],byOld:new Map(),filter:'all',shown:30,selected:null,ready:false};
function positive(r){
 const l=[],loc=r[8],up=r[9],year=r[10],units=r[11],n12=r[12],rel=r[16],comp=r[17];
 if(comp>=3&&rel!=null&&rel<=-8)l.push('같은 행정동 유사 평형 '+comp+'개와 비교한 공급평당가가 '+Math.abs(rel).toFixed(1)+'% 낮습니다. 다만 면적·층·타입 차이는 완전히 제거되지 않았습니다.');
 if(loc>=85)l.push('자체 입지점수 '+loc.toFixed(1)+'점으로 입지 측면에서 상위권입니다.');
 else if(loc>=65)l.push('자체 입지점수 '+loc.toFixed(1)+'점으로 수도권 내 일정한 입지 경쟁력이 있습니다.');
 if(year>=2019)l.push(year+'년 준공으로 연식 측면의 상대적인 강점이 있습니다.');
 else if(year>=2010)l.push(year+'년 준공으로 노후 구축 대비 연식 부담이 작습니다.');
 if(units>=1500)l.push(fmt.format(units)+'세대의 대단지 규모는 수요 저변 측면의 참고 지표입니다.');
 if(up>=12)l.push('내부 모형의 예상여력은 '+pc(up)+'입니다. 실현 수익률을 의미하지는 않습니다.');
 if(r[14]<=200&&r[15]<=200)l.push('기존 대체모형 A/B 모두 200위 안으로 평가했습니다. 다만 동일 원자료에 의존하는 모형입니다.');
 if(n12>=20)l.push('최근 12개월 거래 '+fmt.format(n12)+'건으로 내부 시세의 표본이 비교적 충분합니다.');
 if(!l.length)l.push('입지·예상여력·연식·규모·상대가격을 함께 평가한 결과입니다. 개별 투자 우위는 추가 확인이 필요합니다.');
 return l.slice(0,3);
}
function negative(r){
 const l=[],rel=r[16],comp=r[17],up=r[9],n12=r[12],n3=r[13],inv=r[21],dom=r[20];
 if(flag(r,8))l.push('동일 동의 하위 순위 평형 중 가격·면적·입지·연식·규모가 모두 동등하거나 우월한 대안 '+dom+'개가 검출됐습니다.');
 if(flag(r,16))l.push('동일 단지 안에서 더 큰 평형의 공급평당가격이 최대 '+inv.toFixed(1)+'% 높은 역전 신호가 있습니다. 개별 계약·타입 검증이 필요합니다.');
 if(comp>=3&&rel!=null&&rel>=12)l.push('유사 평형 대비 공급평당가가 '+rel.toFixed(1)+'% 높아 가격 매력이 제한될 수 있습니다.');
 if(n12===0)l.push('최근 12개월 거래 표본이 0건이므로 입력 시세와 평형별 유동성의 신뢰도가 낮습니다.');
 else if(n12<=4)l.push('최근 12개월 거래 '+n12+'건으로 거래 표본이 적어 대표 시세에 오차가 클 수 있습니다.');
 if(n3===0&&n12>=5)l.push('최근 3개월 거래가 없어 현재 입력 시세의 최신성이 제한적입니다.');
 if(flag(r,2))l.push('단지 식별 연결이 미확정되어 동명이단지 또는 평형 매칭 검증이 필요합니다.');
 if(flag(r,1))l.push('기존 종합점수가 0점으로 절단된 평형입니다. 기존 감점의 경제적 타당성을 별도로 확인해야 합니다.');
 if(up<=-8)l.push('내부 예상여력이 '+pc(up)+'로 낮게 산출돼 가격 상승 여력에 의문이 있습니다.');
 if(r[10]<=1995)l.push('오래된 단지의 정비사업 가능성은 사업비·대지지분·추정분담금 검증 전까지 확정적인 프리미엄으로 볼 수 없습니다.');
 if(l.length===0)l.push('국토부 실제 계약 원본과 대지지분·주차·타입의 독립 검증이 끝나지 않았습니다.');
 return l.slice(0,3);
}
function movement(r){
 const d=delta(r);
 return d>0?'<strong class="movup">▲ '+fmt.format(d)+'계단</strong>':d<0?'<strong class="movdown">▼ '+fmt.format(-d)+'계단</strong>':'<strong class="movsame">— 유지</strong>';
}
function filterMatch(r){
 const q=$('search').value.trim().toLocaleLowerCase('ko-KR'),text=(r[2]+' '+r[3]+' '+r[4]+'평 '+r[0]+'위 '+r[1]+'위').toLocaleLowerCase('ko-KR');
 if(q&&!q.split(/\s+/).every(t=>text.includes(t)))return false;
 if($('region').value!=='all'&&region(r)!=$('region').value)return false;
 if($('trustFilter').value!=='all'&&r[19]!==$('trustFilter').value)return false;
 switch(data.filter){
 case 'up':return delta(r)>0;
 case 'down':return delta(r)<0;
 case 'zero':return flag(r,1);
 case 'risk':return r[19]==='낮음'||flag(r,8)||flag(r,16)||flag(r,32);
 case 'top':return r[0]<=30;
 default:return true;
 }
}
function showList(){
 if(!data.ready)return;
 let rows=data.rows.filter(filterMatch);
 const sort=$('sort').value;
 if(sort==='rise')rows.sort((a,b)=>delta(b)-delta(a)||a[0]-b[0]);
 else if(sort==='fall')rows.sort((a,b)=>delta(a)-delta(b)||a[0]-b[0]);
 else if(sort==='price')rows.sort((a,b)=>a[5]-b[5]||a[0]-b[0]);
 $('count').textContent=fmt.format(rows.length)+'개 평형';
 const shown=rows.slice(0,data.shown);
 const markup=shown.map(r=>'<button class="item'+(r[1]===data.selected?' selected':'')+'" type="button" data-old="'+r[1]+'" aria-label="'+esc(r[2]+' '+r[4]+'평 새 순위 '+r[0]+'위')+'"><span class="rank">'+fmt.format(r[0])+'</span><span style="min-width:0"><span class="name">'+esc(r[2])+' <span style="color:#205ce0">'+r[4]+'평</span></span><span class="desc">'+esc(r[3])+' · 기존 '+fmt.format(r[1])+'위 · '+esc(r[19])+' 신뢰도</span></span><span class="price">'+shortMoney(r[5])+'</span><span class="movement">'+movement(r)+'<small>기존 '+fmt.format(r[1])+'위</small></span></button>').join('');
 $('list').innerHTML=markup||'<div class="empty">검색 조건에 해당하는 평형이 없습니다.</div>';
 $('loadRow').hidden=rows.length<=shown.length;
 $('more').textContent='30개 더 보기 ('+fmt.format(shown.length)+' / '+fmt.format(rows.length)+')';
}
function metricBars(r){
 const m=[['입지',22,25],['예상여력',23,18],['대체모형',24,15],['준공연도',25,16],['대단지 규모',26,9],['상대가격',27,10],['기존 점수',28,7]];
 return m.map(([name,index,max])=>'<div class="barrow"><span>'+name+'</span><span class="track"><span class="fill" style="display:block;width:'+(100*r[index]/max).toFixed(1)+'%"></span></span><span style="text-align:right">'+Number(r[index]).toFixed(1)+' / '+max+'</span></div>').join('');
}
function renderDetail(r){
 const trustCls=r[19]==='높음'?'':r[19]==='보통'?'mid':'low',p=positive(r),n=negative(r);
 const sum=r.slice(22,29).reduce((s,v)=>s+Number(v),0),discount=Math.max(0,sum-r[6]);
 const orig=r[7]===0?'0점 동률':Number(r[7]).toFixed(1)+'점';
 const strong=movement(r).replace(/strong/g,'b');
 $('detail').innerHTML='<div class="detailHeader"><div class="detailtop"><span class="kicker">INVESTMENT REVIEW · NO. '+fmt.format(r[0])+'</span><span class="trust '+trustCls+'">자료 신뢰도 '+esc(r[19])+'</span></div><h2>'+esc(r[2])+' '+r[4]+'평</h2><p class="location">'+esc(r[3])+' · '+r[10]+'년 준공 · '+fmt.format(r[11])+'세대</p><div class="pricebig">'+formatMoney(r[5])+'<small>분석 기준 시세</small></div><div class="rankboxes"><div><small>기존 순위</small><b>'+fmt.format(r[1])+'위</b></div><span class="arr">→</span><div><small>새 투자 가치 순위</small><b style="color:#225be8">'+fmt.format(r[0])+'위</b></div></div><p style="margin:10px 0 0;text-align:center;color:#718198;font-size:12px">변동 '+strong+' · 기존 점수 '+orig+'</p></div>'+
 '<div class="scoreinfo"><div class="metric"><small>재평가 점수</small><b>'+Number(r[6]).toFixed(1)+'</b></div><div class="metric"><small>입지 자체점수</small><b>'+Number(r[8]).toFixed(1)+'</b></div><div class="metric"><small>모형 예상여력</small><b style="color:'+(r[9]>=0?'#13865d':'#db514b')+'">'+pc(r[9])+'</b></div></div>'+
 '<div class="detailBody"><h3>이 순위를 지지하는 근거</h3>'+p.map(t=>'<p class="reason">'+esc(t)+'</p>').join('')+
 '<div class="sectionline"></div><h3>반대 근거 및 확인할 위험</h3>'+n.map(t=>'<p class="reason risk">'+esc(t)+'</p>').join('')+
 '<div class="sectionline"></div><h3>점수 구성</h3>'+metricBars(r)+'<p style="font-size:11px;color:#8793a3;margin:9px 0 0">자료·이상신호 감점: '+discount.toFixed(1)+'점. 각 항목은 정규화 점수를 가중합한 값이며 예측 수익률이 아닙니다.</p>'+
 '<div class="sectionline"></div><h3>판단을 위한 데이터</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;color:#738197;font-size:12px"><div>최근 12개월 거래<br><strong style="color:#283951">'+fmt.format(r[12])+'건</strong></div><div>최근 3개월 거래<br><strong style="color:#283951">'+fmt.format(r[13])+'건</strong></div><div>대체모형 A/B<br><strong style="color:#283951">'+fmt.format(r[14])+' / '+fmt.format(r[15])+'위</strong></div><div>동일 동 유사평형<br><strong style="color:#283951">'+r[17]+'개 '+(r[16]!=null?'('+pc(r[16])+')':'(불충분)')+'</strong></div></div>'+
 '<p class="mini-note">※ 같은 동 상대가격 비교는 면적·층·타입을 완전히 통제하지 못합니다. 국토부 계약 해제·직거래·전용면적별 원본 신규 독립검증은 아직 진행되지 않았습니다. 데이터 내 ‘자료 신뢰도 높음’은 원본 인증을 뜻하지 않습니다.</p>'+
 '<a class="fullButton" href="#method">재평가 기준 확인</a></div>';
}
$('list').addEventListener('click',e=>{
 const node=e.target.closest('[data-old]');if(!node)return;
 const old=Number(node.dataset.old),r=data.byOld.get(old);if(!r)return;
 data.selected=old;showList();renderDetail(r);
 if(window.innerWidth<=1000){$('detail').scrollIntoView({behavior:'smooth',block:'start'});}
});
$('more').addEventListener('click',()=>{data.shown+=30;showList()});
$('search').addEventListener('input',()=>{data.shown=30;showList()});
$('sort').addEventListener('change',()=>{data.shown=30;showList()});
$('region').addEventListener('change',()=>{data.shown=30;showList()});
$('trustFilter').addEventListener('change',()=>{data.shown=30;showList()});
$('filters').addEventListener('click',e=>{
 const btn=e.target.closest('[data-filter]');if(!btn)return;
 data.filter=btn.dataset.filter;data.shown=30;
 $('filters').querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===btn));showList();
});
async function load(){
 try{
  const parts=await Promise.all(Array.from({length:6},(_,i)=>fetch('/preview-under6/ranks-'+(i+1)+'.json').then(r=>{if(!r.ok)throw Error('순위 데이터 '+(i+1)+' 로드 오류');return r.json()})));
  const rows=parts.flatMap(p=>p.rows);
  if(rows.length!==5630)throw Error('평형 누락 '+rows.length);
  const ids=new Set(),ranks=new Set();
  for(const r of rows){
   if(!Array.isArray(r)||r.length!==29||ids.has(r[1])||ranks.has(r[0]))throw Error('중복·오류 데이터');
   ids.add(r[1]);ranks.add(r[0]);
  }
  if(!rows.every((r,i)=>r[0]===i+1)||rows[0][1]!==1)throw Error('순위 무결성 확인 실패');
  data.rows=rows;data.byOld=new Map(rows.map(r=>[r[1],r]));data.ready=true;data.selected=1;
  $('stat-total').textContent=fmt.format(rows.length);
  $('stat-up').textContent=fmt.format(rows.filter(r=>delta(r)>0).length);
  $('stat-down').textContent=fmt.format(rows.filter(r=>delta(r)<0).length);
  $('stat-zero').textContent=fmt.format(rows.filter(r=>flag(r,1)).length);
  showList();renderDetail(rows[0]);
 }catch(e){
  $('list').innerHTML='<div class="empty">순위 데이터를 읽지 못했습니다. '+esc(e.message)+'<br>새로고침 후 다시 확인해 주세요.</div>';
  $('count').textContent='오류';
 }
}
load();
})();