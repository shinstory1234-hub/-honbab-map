/* 아파트맵 단지 상세 — 리치고 차용 기능(2026.11.16)
   첫 화면 번들에 안 들어감: 단지를 처음 눌렀을 때만 이 파일을 받고, 단지마다 /api/apt-dx 로 실거래를 받아 그림.
   - 실거래 차트(3년·5년·전체, 월 중위선·거래량·최고가 표시), 최근 실거래 목록(신고가 N·직거래 표시)
   - 최근 실거래·최고가 대비·1년 전 대비 요약, 층별 가격(최근 12개월), 평형별 시세 전체, 단지 정보(세대·용적률·사용승인)
   - 같은 동 전체 단지 평당 시세 순위(가격대 무관)
   - 하락 레이스: 정렬 '최고가 대비 하락순'(직전 2년 최고가 → 최근 3개월 중위, 직거래·1~2층 제외) */
(function(){
  var ALIAS={
    '상계주공14|서울 노원구 상계동':'11350|상계동|상계주공14(고층)',
    '상계주공10|서울 노원구 상계동':'11350|상계동|상계주공10(고층)',
    '상계주공2|서울 노원구 상계동':'11350|상계동|상계주공2(고층)',
    '주공8|광명시 하안동':'41210|하안동|주공8(고층)'
  };
  function lkey(d){
    var k=d.n+'|'+d.area; if(ALIAS[k]) return ALIAS[k];
    var f=(window.FARD||{})[k], s=f&&f[6];
    return s?s+'|'+String(d.area).split(' ').pop()+'|'+d.n:null;
  }
  window.aptLkey=lkey;
  var CACHE={};
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function won(v){ if(v==null||!isFinite(v)) return '—'; v=Math.round(v); var e=Math.floor(v/10000), m=v%10000; return (e?e+'억'+(m?' ':''):'')+(m?m.toLocaleString()+(e?'':'만'):''); }
  function eo(v){ return (v/10000).toFixed(v>=100000?1:2).replace(/\.?0+$/,'')+'억'; }
  function ymd(n){ var s=String(n); return s.slice(2,4)+'.'+s.slice(4,6)+'.'+s.slice(6,8); }
  function tms(n){ var s=String(n); return Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8)); }
  function med(a){ if(!a.length) return null; a=a.slice().sort(function(x,y){return x-y;}); var h=a.length>>1; return a.length%2?a[h]:(a[h-1]+a[h])/2; }
  function pct(x){ return (x>=0?'+':'')+(x*100).toFixed(1)+'%'; }
  var ab=function(area){ return Math.round(area/5)*5; };

  function pickAb(d,j){
    var lc=j.lc||[], r=null;
    lc.forEach(function(x){ if(x[1]===d.py) r=x; });
    if(!r&&lc.length) r=lc.slice().sort(function(a,b){return Math.abs(a[1]-d.py)-Math.abs(b[1]-d.py);})[0];
    if(r) return r[0];
    var c={}; (j.t||[]).forEach(function(t){ var b=ab(t[1]); c[b]=(c[b]||0)+1; });
    var best=null; for(var b in c) if(best==null||c[b]>c[best]) best=b; return best!=null?+best:null;
  }

  function chart(rows,period){
    var now=Date.now(), from=period==='all'?0:now-period*365.25*864e5;
    var R=rows.filter(function(t){return tms(t[0])>=from;});
    if(R.length<2) return '<p class="note">이 기간 거래가 부족해요.</p>';
    var W=340,H=170,PL=34,PR=8,PT=14,PB=40,VH=22;
    var x0=period==='all'?tms(R[0][0]):from, x1=now;
    var lo=Infinity,hi=-Infinity; R.forEach(function(t){ lo=Math.min(lo,t[3]); hi=Math.max(hi,t[3]); });
    var pad=(hi-lo)*.08||hi*.05; lo-=pad; hi+=pad;
    var X=function(ms){return PL+(ms-x0)/(x1-x0)*(W-PL-PR);}, Y=function(v){return PT+(hi-v)/(hi-lo)*(H-PT-PB);};
    var dots='', mon={}, vol={};
    R.forEach(function(t){ var ms=tms(t[0]);
      dots+='<circle cx="'+X(ms).toFixed(1)+'" cy="'+Y(t[3]).toFixed(1)+'" r="2.2" fill="#94a3b8" fill-opacity="'+(t[4]?'.35':'.75')+'"/>';
      var mk=String(t[0]).slice(0,6); if(!t[4]) (mon[mk]=mon[mk]||[]).push(t[3]); vol[mk]=(vol[mk]||0)+1; });
    var keys=Object.keys(mon).sort(), line='';
    keys.forEach(function(k,i){ var ms=Date.UTC(+k.slice(0,4),+k.slice(4,6)-1,15); line+=(i?'L':'M')+X(ms).toFixed(1)+' '+Y(med(mon[k])).toFixed(1); });
    var vmax=0; for(var k in vol) vmax=Math.max(vmax,vol[k]);
    var bw=Math.max(1.5,(W-PL-PR)/Math.max(12,(x1-x0)/(30.4*864e5))-1), bars='';
    for(k in vol){ var ms=Date.UTC(+k.slice(0,4),+k.slice(4,6)-1,15), h=vol[k]/vmax*VH; bars+='<rect x="'+(X(ms)-bw/2).toFixed(1)+'" y="'+(H-PB+16+VH-h-14).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="#cbd5e1"/>'; }
    var top=R.reduce(function(a,t){return t[3]>a[3]?t:a;},R[0]);
    var yrs='', y0=new Date(x0).getUTCFullYear(), y1=new Date(x1).getUTCFullYear(), step=Math.max(1,Math.ceil((y1-y0)/6));
    for(var y=y0+1;y<=y1;y+=step){ var xm=X(Date.UTC(y,0,1)); yrs+='<text x="'+xm.toFixed(1)+'" y="'+(H-2)+'" font-size="9" text-anchor="middle" fill="#64748b">'+y+'</text><line x1="'+xm.toFixed(1)+'" x2="'+xm.toFixed(1)+'" y1="'+PT+'" y2="'+(H-PB)+'" stroke="#eef2f7"/>'; }
    var grid='';
    [0,.5,1].forEach(function(f){ var v=lo+(hi-lo)*(1-f)*1, yy=PT+f*(H-PT-PB); v=hi-(hi-lo)*f; grid+='<text x="2" y="'+(yy+3).toFixed(1)+'" font-size="9" fill="#64748b">'+eo(v)+'</text><line x1="'+PL+'" x2="'+(W-PR)+'" y1="'+yy.toFixed(1)+'" y2="'+yy.toFixed(1)+'" stroke="#eef2f7"/>'; });
    var tx=X(tms(top[0])), ty=Y(top[3]);
    return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="실거래가 차트" style="display:block">'+grid+yrs+bars+dots
      +'<path d="'+line+'" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-linejoin="round"/>'
      +'<circle cx="'+tx.toFixed(1)+'" cy="'+ty.toFixed(1)+'" r="3.2" fill="#e5484d"/><text x="'+Math.min(W-PR,Math.max(PL+20,tx)).toFixed(1)+'" y="'+Math.max(10,ty-6).toFixed(1)+'" font-size="9.5" font-weight="700" text-anchor="middle" fill="#e5484d">최고 '+eo(top[3])+'</text>'
      +'<text x="'+(W-PR)+'" y="'+(H-PB+12)+'" font-size="8.5" text-anchor="end" fill="#94a3b8">거래량</text></svg>'
      +'<p class="note" style="margin-top:4px">점=실거래(흐린 점은 직거래) · 파란 선=월 중위(직거래 제외) · 회색 막대=월 거래량</p>';
  }

  function drawDx(d,j,box,selectedArea,floorMode,omitDirect){
    var all=j.t||[],A=selectedArea==null?pickAb(d,j):+selectedArea;
    floorMode=floorMode||'all';omitDirect=!!omitDirect;
    var areaRows=all.filter(function(t){return ab(t[1])===A;});
    var maxFloor=areaRows.reduce(function(n,t){return Math.max(n,t[2]);},0);
    var floor1=Math.max(1,Math.floor(maxFloor/3)),floor2=Math.max(floor1,Math.floor(maxFloor*2/3));
    var rows=areaRows.filter(function(t){return (floorMode==='all'||(floorMode==='low'&&t[2]<=floor1)||(floorMode==='mid'&&t[2]>floor1&&t[2]<=floor2)||(floorMode==='high'&&t[2]>floor2))&&(!omitDirect||!t[4]);});
    var areaOptions=Array.from(new Set(all.map(function(t){return ab(t[1]);}))).sort(function(a,b){return a-b;});
    var h='<section class="sec" data-dx="1"><h3>실거래 상세 조건 <small>선택 평형 · 층 · 직거래</small></h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:10px 0"><label style="font-size:12px">전용면적대<select class="dxarea" aria-label="전용면적대 선택" style="display:block;width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:5px;background:var(--bg);color:var(--text)">'+areaOptions.map(function(v){return '<option value="'+v+'"'+(v===A?' selected':'')+'>'+v+'㎡대</option>';}).join('')+'</select></label><label style="font-size:12px">층 구간<select class="dxfloor" aria-label="층 구간 선택" style="display:block;width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:5px;background:var(--bg);color:var(--text)">'+[['all','전체 층'],['low','저층(1~'+floor1+'층)'],['mid','중층('+(floor1+1)+'~'+floor2+'층)'],['high','고층('+(floor2+1)+'층~)']].map(function(t){return '<option value="'+t[0]+'"'+(floorMode===t[0]?' selected':'')+'>'+t[1]+'</option>';}).join('')+'</select></label></div><label style="display:inline-flex;align-items:center;gap:8px;font-size:13px"><input class="dxndirect" type="checkbox" '+(omitDirect?'checked':'')+'>직거래 제외</label><p class="note">정확한 타입 자료가 없어 전용면적을 5㎡ 단위로 묶어 표시합니다. 층 구간은 해당 면적대 거래의 최고층 기준으로 나눕니다. 현재 '+rows.length+'건.</p></section>';
    if(!rows.length)h+='<section class="sec" data-dx="1"><p class="note">선택 조건에 맞는 실거래가 없습니다.</p></section>';
    if(rows.length){
      var now=Date.now(), last=rows[rows.length-1], peak=rows.reduce(function(a,t){return t[3]>a[3]?t:a;},rows[0]);
      var nd=rows.filter(function(t){return !t[4];});
      var r3=nd.filter(function(t){return tms(t[0])>=now-91*864e5;}).map(function(t){return t[3];});
      var y3=nd.filter(function(t){var m=tms(t[0]);return m>=now-456*864e5&&m<now-365*864e5;}).map(function(t){return t[3];});
      var m3=med(r3), my=med(y3), cur=m3!=null?m3:last[3];
      h+='<section class="sec" data-dx="1"><h3>실거래가 <small>전용 '+A+'㎡대 · 선택 조건 '+rows.length.toLocaleString()+'건(2017.7~)</small></h3>'
        +'<dl class="facts tnum">'
        +'<div><dt>최근 실거래<small>'+ymd(last[0])+' · '+last[2]+'층'+(last[4]?' · 직거래':'')+'</small></dt><dd>'+won(last[3])+'</dd></div>'
        +'<div><dt>'+(floorMode!=='all'||omitDirect?'선택 거래 최고가':'역대 최고가')+'<small>'+ymd(peak[0])+' · '+peak[2]+'층</small></dt><dd>'+won(peak[3])+'</dd></div>'
        +'<div><dt>최고가 대비<small>최근 3개월 중위'+(m3!=null?' ('+r3.length+'건)':' 없음 → 마지막 거래')+'</small></dt><dd style="color:'+(cur>=peak[3]?'#0a7d3e':'#e5484d')+'">'+(cur>=peak[3]?'신고가 수준':pct(cur/peak[3]-1))+'</dd></div>'
        +(my!=null&&m3!=null?'<div><dt>1년 전 대비<small>최근 3개월 중위 vs 1년 전 같은 기간</small></dt><dd style="color:'+(m3>=my?'#0a7d3e':'#e5484d')+'">'+pct(m3/my-1)+'</dd></div>':'')
        +'</dl><div class="dxp" role="group" aria-label="기간" style="display:flex;gap:6px;margin:12px 0 6px">'
        +['3','5','all'].map(function(p,i){return '<button type="button" data-p="'+p+'" aria-pressed="'+(i===0)+'" style="flex:1;padding:6px 0;border-radius:8px;border:1px solid #e2e8f0;background:'+(i===0?'#0f172a;color:#fff':'#fff')+';font-weight:600">'+(p==='all'?'전체':p+'년')+'</button>';}).join('')
        +'</div><div class="dxc">'+chart(rows,3)+'</div>';
      // 층별(최근 12개월, 직거래 제외)
      var y12=nd.filter(function(t){return tms(t[0])>=now-365*864e5;}), mf=0;
      rows.forEach(function(t){ if(t[2]>mf) mf=t[2]; });
      if(y12.length>=3&&mf>=3){
        var g=[[],[],[]], c1=Math.floor(mf/3), c2=Math.floor(mf*2/3);
        y12.forEach(function(t){ g[t[2]<=c1?0:t[2]<=c2?1:2].push(t[3]); });
        h+='<h4 style="margin:14px 0 6px;font-size:14px">층별 가격 <small style="color:#64748b;font-weight:500">최근 12개월 · 직거래 제외 · 중위</small></h4><dl class="facts tnum">'
          +['저층(1~'+c1+'층)','중층('+(c1+1)+'~'+c2+'층)','고층('+(c2+1)+'층~)'].map(function(l,i){return '<div><dt>'+l+'<small>'+g[i].length+'건</small></dt><dd>'+(g[i].length?won(med(g[i])):'—')+'</dd></div>';}).join('')+'</dl>';
      }
      // 거래 목록(신고가 = 그때까지 같은 면적대 최고가 갱신)
      var mx=0, flag=rows.map(function(t){ var n=t[3]>mx&&!t[4]; if(!t[4]) mx=Math.max(mx,t[3]); return n; });
      var list=rows.map(function(t,i){return [t,flag[i]];}).reverse();
      var tr=function(n){ return list.slice(0,n).map(function(x){ var t=x[0]; return '<tr><td>'+ymd(t[0])+'</td><td style="text-align:right;font-weight:700">'+won(t[3])+(x[1]?' <b style="color:#e5484d;font-size:10px">신고가</b>':'')+(t[4]?' <small style="color:#94a3b8">직거래</small>':'')+'</td><td style="text-align:right">'+t[2]+'층</td><td style="text-align:right;color:#64748b">'+t[1]+'㎡</td></tr>'; }).join(''); };
      h+='<table class="tnum dxt" style="width:100%;border-collapse:collapse;margin-top:12px;font-size:13px"><thead><tr style="color:#64748b;font-size:12px"><th style="text-align:left;font-weight:500">계약일</th><th style="text-align:right;font-weight:500">거래가</th><th style="text-align:right;font-weight:500">층</th><th style="text-align:right;font-weight:500">전용</th></tr></thead><tbody>'+tr(10)+'</tbody></table>'
        +(list.length>10?'<button type="button" class="btn ghost dxm" style="width:100%;margin-top:8px">실거래 더보기 ('+list.length.toLocaleString()+'건)</button>':'')
        +'<p class="note">해제 거래 제외. 신고가 = 그 시점까지 같은 면적대(직거래 제외) 최고가를 넘은 거래.</p></section>';
    }
    // 평형별 시세(가격대 무관 전체)
    var lc=(j.lc||[]).filter(function(x){return x[2]>0;});
    if(lc.length){
      h+='<section class="sec" data-dx="1"><h3>평형별 시세 <small>전체 평형 · 실거래 환산</small></h3><div class="cmp tnum">'
        +lc.map(function(x){return '<div role="button" tabindex="0" data-dx-unit="'+x[0]+'" style="cursor:pointer"'+(x[0]===A?' class="me"':'')+'><span class="n">'+x[1]+'평(전용 '+x[0]+'㎡대) · 12개월 '+(x[3]||0)+'건 · 평당 '+Math.round(x[2]/x[1]).toLocaleString()+'만</span><span class="v">'+won(x[2])+'</span></div>';}).join('')+'</div></section>';
    }
    // 단지 정보
    var cx=j.cx;
    if(cx){
      var ud=cx[2]?String(cx[2]):'';
      h+='<section class="sec" data-dx="1"><h3>단지 정보 <small>건축물대장</small></h3><dl class="facts tnum">'
        +(cx[0]?'<div><dt>세대수</dt><dd>'+Number(cx[0]).toLocaleString()+'세대</dd></div>':'')
        +(cx[1]?'<div><dt>용적률</dt><dd>'+Math.round(cx[1])+'%</dd></div>':'')
        +(ud.length>=6?'<div><dt>사용승인</dt><dd>'+ud.slice(0,4)+'.'+ud.slice(4,6)+'</dd></div>':'')
        +'</dl></section>';
    }
    // 같은 동 전체 평당 시세 순위
    var me=(lkey(d)||'').split('|').slice(2).join('|');
    var nb=(j.nb||[]).filter(function(x){return x[4]==null||x[4]>=100||x[0]===me;});
    if(nb.length>1){
      var at=-1; nb.forEach(function(x,i){ if(x[0]===me) at=i; });
      var dong=String(d.area).split(' ').pop(), show=nb.slice(0,10); if(at>=10) show.push(nb[at]);
      h+='<section class="sec" data-dx="1"><h3>'+E(dong)+' 평당 시세 순위 <small>가격대 무관 · 100세대 이상</small></h3>'
        +'<p style="margin:0 0 8px;font-size:14px">'+(at>=0?'<b>'+nb.length+'곳 중 '+(at+1)+'위</b> · ':'')+'가장 비싼 곳 '+E(nb[0][0])+'(평당 '+Math.round(nb[0][2]/nb[0][1]).toLocaleString()+'만)</p>'
        +'<table class="tnum" style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="color:#64748b;font-size:12px"><th style="text-align:left;font-weight:500">순위</th><th style="text-align:left;font-weight:500">단지</th><th style="text-align:right;font-weight:500">세대</th><th style="text-align:right;font-weight:500">입주</th><th style="text-align:right;font-weight:500">평당</th></tr></thead><tbody>'
        +show.map(function(x){ var i=nb.indexOf(x); return '<tr'+(x[0]===me?' style="background:#eff6ff;font-weight:700"':'')+'><td>'+(i+1)+'위</td><td>'+E(x[0])+'</td><td style="text-align:right">'+(x[4]?Number(x[4]).toLocaleString():'—')+'</td><td style="text-align:right">'+(x[5]||'—')+'</td><td style="text-align:right">'+Math.round(x[2]/x[1]).toLocaleString()+'만</td></tr>'; }).join('')
        +'</tbody></table><p class="note">단지마다 거래가 가장 많은 평형의 실거래 환산 시세 ÷ 평. 작은 평형 위주 단지는 평당가가 높게 나와요.</p></section>';
    }
    if(!h){ box.innerHTML=''; return; }
    box.innerHTML=h;
    var applyFilters=function(){var a=box.querySelector('.dxarea'),f=box.querySelector('.dxfloor'),v=box.querySelector('.dxndirect');drawDx(d,j,box,a?+a.value:A,f?f.value:'all',v&&v.checked);};
    ['.dxarea','.dxfloor','.dxndirect'].forEach(function(sel){var el=box.querySelector(sel);if(el)el.onchange=applyFilters;});
    box.querySelectorAll('[data-dx-unit]').forEach(function(b){var go=function(){drawDx(d,j,box,+b.dataset.dxUnit,'all',false);};b.onclick=go;b.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}};});
    box.querySelectorAll('.dxp button').forEach(function(b){ b.onclick=function(){
      box.querySelectorAll('.dxp button').forEach(function(o){ o.setAttribute('aria-pressed','false'); o.style.background='#fff'; o.style.color=''; });
      b.setAttribute('aria-pressed','true'); b.style.background='#0f172a'; b.style.color='#fff';
      box.querySelector('.dxc').innerHTML=chart(rows,b.dataset.p==='all'?'all':+b.dataset.p); }; });
    var more=box.querySelector('.dxm'), n=10;
    if(more) more.onclick=function(){ n+=30; box.querySelector('.dxt tbody').innerHTML=tr(n); if(n>=list.length) more.remove(); };
  }

  window.APTDX=function(d,body){
    var k=lkey(d); if(!k||!body) return;
    body.querySelectorAll('.dxbox').forEach(function(x){ x.remove(); });
    var box=document.createElement('div'); box.className='dxbox';
    box.innerHTML='<section class="sec" data-dx="1"><h3>실거래가</h3><p class="note">실거래 불러오는 중…</p></section>';
    var anchor=null; body.querySelectorAll('section.sec > h3').forEach(function(h){ if(!anchor&&/^(시세 흐름|사면 드는 돈)/.test(h.textContent.trim())) anchor=h.parentNode; });
    if(anchor) anchor.parentNode.insertBefore(box,anchor); else { var id=body.querySelector('.identity'); (id&&id.nextSibling)?id.parentNode.insertBefore(box,id.nextSibling):body.appendChild(box); }
    var done=function(j){ if(box.isConnected){ drawDx(d,j,box);window.APT_DX_INFO=window.APT_DX_INFO||{};window.APT_DX_INFO[k]=j;if(window.AP1X)window.AP1X.onDx(d,j,body); } };
    if(CACHE[k]) return done(CACHE[k]);
    fetch('/api/apt-dx?k='+encodeURIComponent(k)).then(function(r){ if(!r.ok) throw 0; return r.json(); })
      .then(function(j){ CACHE[k]=j; done(j); }).catch(function(){ if(box.isConnected) box.innerHTML=''; });
  };

  window.APTRACE=function(){
    if(window.RACE_LOADING) return; window.RACE_LOADING=1;
    fetch('/api/apt-race').then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(m){ if(!m||!Object.keys(m).length) throw 0;
      window.RACE=m||{};
      D.forEach(function(d){ var r=m[lkey(d)]; d.rc=r&&r[1]>0?r[2]/r[1]-1:null; d.rcab=r?r[0]:null; d.rcAmt=r&&r[1]>0?r[2]-r[1]:null; d.rcN=r?r[3]:null; });
      if(window.aptRerenderList) window.aptRerenderList();
    }).catch(function(){ window.RACE_LOADING=0; });
  };
})();
