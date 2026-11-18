/* 아파트맵 단지 상세 — 리치고 차용 기능(2026.11.16)
   첫 화면 번들에 안 들어감: 단지를 처음 눌렀을 때만 이 파일을 받고, 단지마다 /api/apt-dx 로 실거래를 받아 그림.
   - 실거래 차트(3년·5년·전체, 최근 3개월 중위 추세·거래량·최고가 표시), 최근 실거래 목록(신고가 N·직거래 표시)
   - 최근 실거래·최고가 대비·1년 전 대비 요약, 층별 가격(최근 12개월), 동 평당 순위
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
    var k=d.n+'|'+d.area;
    if(d.liveKey)return d.liveKey;
    if(ALIAS[k]) return ALIAS[k];
    var f=(window.FARD||{})[k], s=f&&f[6];
    return s?s+'|'+String(d.area).split(' ').pop()+'|'+d.n:null;
  }
  window.aptLkey=lkey;
  (function(){ var st=document.createElement('style'); st.textContent=
    '.dxbox,.dxbox *{box-sizing:border-box}.dxbox{max-width:100%;overflow:hidden}.dxbox svg{max-width:100%}'
   +'.dxl{border-top:1px solid var(--border-soft,#eef2f7)}'
   +'.dxr{display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid var(--border-soft,#eef2f7);min-width:0}'
   +'.dxr .l{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}'
   +'.dxr .l b{font-size:14.5px;font-weight:650;color:var(--text,#0f172a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
   +'.dxr .l span{font-size:12.5px;color:var(--text-tertiary,#64748b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
   +'.dxr .r{flex:none;text-align:right;font-size:15.5px;font-weight:750;color:var(--text,#0f172a);display:flex;flex-direction:column;align-items:flex-end;gap:2px}'
   +'.dxr .r small{font-size:11.5px;font-weight:500;color:var(--text-faint,#94a3b8)}'
   +'.dxr .r.dim{color:var(--text-tertiary,#64748b);font-weight:600}'
   +'.dxr .nw{font-style:normal;font-size:11px;font-weight:700;color:#e5484d;background:#fdecec;border-radius:4px;padding:1px 6px}'
   +'.dxr .tag{font-style:normal;font-size:11px;font-weight:700;color:#2563eb;background:#eaf1ff;border-radius:4px;padding:1px 6px;margin-left:6px;vertical-align:1px}'
   +'.dxr .no{flex:none;width:22px;font-style:normal;font-size:13px;font-weight:700;color:var(--text-faint,#94a3b8);text-align:center}'
   +'.dxr.me{background:#f3f7ff;margin:0 -8px;padding-left:10px;padding-right:10px;border-radius:8px}.dxr.me .no{color:#2563eb}'
   +'.dxh{margin:22px 0 8px;font-size:15px;font-weight:700}.dxh small{margin-left:6px;font-size:12px;font-weight:500;color:var(--text-tertiary,#64748b)}'
   +'.dxk{margin:2px 0 10px;font-size:14px}'
   +'.dxrow{display:flex;gap:6px;overflow-x:auto;margin:6px 0 12px;scrollbar-width:none}.dxrow::-webkit-scrollbar{display:none}'
   +'.dxc1{flex:none;border:1px solid var(--border,#e2e8f0);background:var(--bg,#fff);color:var(--text,#0f172a);border-radius:999px;padding:7px 14px;font-size:13.5px;font-weight:650;line-height:1.2}'
   +'.dxc1 small{display:block;font-size:10.5px;font-weight:500;color:var(--text-faint,#94a3b8)}.dxc1.on{background:#0f172a;color:#fff;border-color:#0f172a}.dxc1.on small{color:#cbd5e1}'
   +'.dxhero{background:var(--surface-2,#f6f8fb);border-radius:14px;padding:16px 16px 14px;margin:4px 0 12px}'
   +'.dxhero .lbl{font-size:12.5px;color:var(--text-tertiary,#64748b)}.dxhero .big{font-size:28px;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px;color:var(--text,#0f172a)}'
   +'.dxhero .pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.dxhero .mini{font-size:12.5px;color:var(--text-tertiary,#64748b)}.dxhero .mini b{color:var(--text,#0f172a)}'
   +'.dxpill{font-size:12.5px;border-radius:999px;padding:4px 10px;background:#fff;border:1px solid var(--border,#e2e8f0);color:var(--text-secondary,#334155)}.dxpill.up b{color:#d6342c}.dxpill.dn b{color:#2563eb}'
   +'.dxseg{display:flex;background:var(--surface-2,#f1f5f9);border-radius:10px;padding:3px;margin:0 0 6px}.dxseg button{flex:1;border:0;background:none;padding:7px 0;border-radius:8px;font-size:13px;font-weight:600;color:var(--text-tertiary,#64748b)}.dxseg button.on{background:#fff;color:var(--text,#0f172a);box-shadow:0 1px 2px rgba(15,23,42,.12)}'
   +'.dxtiles{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.dxtile{border:1px solid var(--border,#e2e8f0);background:var(--bg,#fff);border-radius:12px;padding:10px 8px;text-align:left;display:flex;flex-direction:column;gap:2px;min-width:0}'
   +'.dxtile span{font-size:12.5px;font-weight:650;color:var(--text-secondary,#334155)}.dxtile span small{font-weight:500;color:var(--text-faint,#94a3b8);font-size:11px}.dxtile b{font-size:15px;font-weight:750;color:var(--text,#0f172a);white-space:nowrap}.dxtile>small{font-size:11px;color:var(--text-faint,#94a3b8)}'
   +'.dxtile.on{border-color:#2563eb;background:#f3f7ff;box-shadow:inset 0 0 0 1px #2563eb}'
   +'.dxhrow{display:flex;justify-content:space-between;align-items:center}.dxtg{font-size:12.5px;font-weight:500;color:var(--text-tertiary,#64748b);display:inline-flex;gap:5px;align-items:center}'
   +'.dxr .dg{font-style:normal;font-size:11px;font-weight:600;color:#64748b;background:#f1f5f9;border-radius:4px;padding:1px 6px;margin-left:6px;vertical-align:2px}.dxr .l b .nw{margin-left:6px;vertical-align:2px}'
   +'.dxmore{width:100%;margin-top:8px;padding:11px 0;border:1px solid var(--border,#e2e8f0);background:var(--bg,#fff);border-radius:10px;font-size:13.5px;font-weight:650;color:var(--text,#0f172a)}';
    st.textContent+=`n.dxbox .dxrow{gap:0;margin:4px 0 16px;border-bottom:1px solid var(--border-soft,#e5e7eb);overflow-x:auto}\n.dxbox .dxc1{border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent!important;color:var(--text-tertiary,#71717a);padding:10px 13px 9px;min-width:65px;box-shadow:none!important}\n.dxbox .dxc1.on{color:var(--text,#171719);border-color:var(--text,#171719)}\n.dxbox .dxc1 small{font-size:11px;margin-top:3px}.dxbox .dxc1.on small{color:var(--text-secondary,#555)}\n.dxbox .dxhero{background:transparent;border:0;border-radius:0;padding:12px 0 15px;margin:2px 0 10px;border-bottom:1px solid var(--border-soft,#e5e7eb)}\n.dxbox .dxhero .big{font-size:32px;letter-spacing:-.045em;margin:4px 0 10px}\n.dxbox .dxpill{border:0;background:transparent;padding:2px 0;border-radius:0}\n.dxbox .dxhero .pills{gap:14px;margin-bottom:8px}\n.dxbox .dxseg{background:transparent;padding:0;border-radius:0;border-bottom:1px solid var(--border-soft,#e5e7eb);margin:0 0 12px}\n.dxbox .dxseg button{border-radius:0;padding:10px 0;border-bottom:2px solid transparent}\n.dxbox .dxseg button.on{background:transparent;box-shadow:none;border-color:var(--text,#171719)}\n.dxbox .dxtiles{gap:0;border-top:1px solid var(--border-soft,#e5e7eb)}\n.dxbox .dxtile{border:0;border-bottom:1px solid var(--border-soft,#e5e7eb);border-radius:0;background:transparent;padding:12px 6px}\n.dxbox .dxtile.on{box-shadow:none;border-bottom:2px solid var(--primary,#0066ff);background:transparent}\n.dxbox .dxmore{border-radius:5px}\n.dxbox .dxr.me{border-radius:4px}\n.dxbox .dxlegend{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;font-size:11px;color:var(--text-tertiary,#71717a);margin:2px 0 8px}\n.dxbox .dxlegend span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}\n.dxbox .dxlegend i{width:8px;height:8px;border-radius:50%;background:#94a3b8}\n.dxbox .dxlegend .line{width:14px;height:2px;background:#2563eb}\n.dxbox .dxlegend .bar{width:8px;height:9px;border-radius:0;background:#cbd5e1}\n.dxbox .dxlegend .source{flex-basis:100%;font-size:10px;color:var(--text-faint,#999)}
.dxbox .dxgap-note{margin:4px 0 12px;font-size:11px;line-height:1.5;color:var(--text-tertiary,#71717a)}`;document.head.appendChild(st); })();
  var CACHE={};
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function won(v){ if(v==null||!isFinite(v)) return '—'; v=Math.round(v); var e=Math.floor(v/10000), m=v%10000; return (e?e+'억'+(m?' ':''):'')+(m?m.toLocaleString()+(e?'':'만'):''); }
  function eo(v){ return (v/10000).toFixed(v>=100000?1:2).replace(/\.?0+$/,'')+'억'; }
  function ymd(n){ var s=String(n); return s.slice(2,4)+'.'+s.slice(4,6)+'.'+s.slice(6,8); }
  function tms(n){ var s=String(n); return Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8)); }
  function med(a){ if(!a.length) return null; a=a.slice().sort(function(x,y){return x-y;}); var h=a.length>>1; return a.length%2?a[h]:(a[h-1]+a[h])/2; }
  function pct(x){ return (x>=0?'+':'')+(x*100).toFixed(1)+'%'; }
  var ab=function(area){ return Math.round(area/5)*5; };

  function listedAb(d,j){
    var row=(j.lc||[]).find(function(x){return x[1]===d.py;});
    return row?row[0]:null;
  }
  function pickAb(d,j){
    var lc=j.lc||[], exact=listedAb(d,j), r=null;
    if(exact!=null)return exact;
    if(!r&&lc.length) r=lc.slice().sort(function(a,b){return Math.abs(a[1]-d.py)-Math.abs(b[1]-d.py);})[0];
    if(r) return r[0];
    var c={}; (j.t||[]).forEach(function(t){ var b=ab(t[1]); c[b]=(c[b]||0)+1; });
    var best=null; for(var b in c) if(best==null||c[b]>c[best]) best=b; return best!=null?+best:null;
  }

  // 직거래 표시가 없는 옛 거래(2026.8 이전) 중 같은 면적대 ±6개월 중위의 80% 미만 = 특수관계·이상 거래 의심(t[5]=1)
  function markOdd(all){ if(all._odd) return; all._odd=1; var by={};
    all.forEach(function(t){ if(!t[4]) (by[ab(t[1])]=by[ab(t[1])]||[]).push(t); });
    Object.keys(by).forEach(function(k){ var a=by[k]; a.forEach(function(t){ var ms=tms(t[0]), nb=[];
      a.forEach(function(u){ if(u!==t&&Math.abs(tms(u[0])-ms)<=183*864e5) nb.push(u[3]); });
      if(nb.length>=3&&t[3]<med(nb)*.8) t[5]=1; }); });
  }
  function bad(t){ return t[4]||t[5]; }
  var TREND_WINDOW=91*864e5;
  function chart(rows,period){
    var now=Date.now(), from=period==='all'?0:now-period*365.25*864e5;
    var history=[], months={}, R=[];
    rows.forEach(function(t){
      if(bad(t)) return;
      var ms=tms(t[0]);
      if(ms<from-TREND_WINDOW||ms>now) return;
      var deal=[ms,t[3]];
      history.push(deal);
      if(ms<from) return;
      R.push(deal);
      var key=String(t[0]).slice(0,6);
      months[key]=(months[key]||0)+1;
    });
    if(!R.length) return '<p class="note">이 기간에 표시할 실거래가 없어요.</p>';
    var W=340,H=170,PL=34,PR=8,PT=14,PB=40,VH=22;
    var x0=period==='all'?Math.min(R[0][0],now-864e5):from, x1=now;
    var lo=Infinity,hi=-Infinity; R.forEach(function(deal){ lo=Math.min(lo,deal[1]); hi=Math.max(hi,deal[1]); });
    var keys=Object.keys(months).sort(), trend=[], start=0, end=0, previousMonth=null, previousTrendMonth=null, hasGap=false;
    // 거래가 있는 달의 말일(이번 달은 오늘)을 기준으로 직전 91일의 거래를 합친다.
    keys.forEach(function(k){
      var year=+k.slice(0,4), monthIndex=+k.slice(4,6)-1, month=year*12+monthIndex;
      if(previousMonth!==null&&month-previousMonth>1) hasGap=true;
      previousMonth=month;
      var nextMonth=Date.UTC(year,monthIndex+1,1), date=nextMonth>now?now:nextMonth-864e5;
      while(end<history.length&&history[end][0]<=date) end++;
      while(start<end&&history[start][0]<date-TREND_WINDOW) start++;
      if(end-start<3) return;
      var value=med(history.slice(start,end).map(function(deal){return deal[1];}));
      trend.push([date,value,previousTrendMonth===month-1]);
      lo=Math.min(lo,value); hi=Math.max(hi,value);
      previousTrendMonth=month;
    });
    var pad=(hi-lo)*.08||hi*.05; lo-=pad; hi+=pad;
    var X=function(ms){return PL+(ms-x0)/(x1-x0)*(W-PL-PR);}, Y=function(v){return PT+(hi-v)/(hi-lo)*(H-PT-PB);};
    var dots='', line='';
    R.forEach(function(deal){
      dots+='<circle cx="'+X(deal[0]).toFixed(1)+'" cy="'+Y(deal[1]).toFixed(1)+'" r="2.2" fill="#94a3b8" fill-opacity=".75"/>'; });
    trend.forEach(function(point){
      line+=(point[2]?'L':'M')+X(point[0]).toFixed(1)+' '+Y(point[1]).toFixed(1); });
    var showMedianLine=line.includes('L');
    var vmax=Math.max.apply(null,keys.map(function(k){return months[k];}));
    var bw=Math.max(1.5,(W-PL-PR)/Math.max(12,(x1-x0)/(30.4*864e5))-1), bars='';
    keys.forEach(function(k){ var ms=Math.min(Date.UTC(+k.slice(0,4),+k.slice(4,6)-1,15),now), h=months[k]/vmax*VH; bars+='<rect x="'+(X(ms)-bw/2).toFixed(1)+'" y="'+(H-PB+16+VH-h-14).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="#cbd5e1"/>'; });
    var top=R.reduce(function(a,deal){return deal[1]>a[1]?deal:a;},R[0]);
    var yrs='', y0=new Date(x0).getUTCFullYear(), y1=new Date(x1).getUTCFullYear(), step=Math.max(1,Math.ceil((y1-y0)/6));
    for(var y=y0+1;y<=y1;y+=step){ var xm=X(Date.UTC(y,0,1)); yrs+='<text x="'+xm.toFixed(1)+'" y="'+(H-2)+'" font-size="9" text-anchor="middle" fill="#64748b">'+y+'</text><line x1="'+xm.toFixed(1)+'" x2="'+xm.toFixed(1)+'" y1="'+PT+'" y2="'+(H-PB)+'" stroke="#eef2f7"/>'; }
    var grid='';
    [0,.5,1].forEach(function(f){ var v=lo+(hi-lo)*(1-f)*1, yy=PT+f*(H-PT-PB); v=hi-(hi-lo)*f; grid+='<text x="2" y="'+(yy+3).toFixed(1)+'" font-size="9" fill="#64748b">'+eo(v)+'</text><line x1="'+PL+'" x2="'+(W-PR)+'" y1="'+yy.toFixed(1)+'" y2="'+yy.toFixed(1)+'" stroke="#eef2f7"/>'; });
    var tx=X(top[0]), ty=Y(top[1]);
    return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="실거래가 차트" style="display:block">'+grid+yrs+bars+dots
      +(showMedianLine?'<path d="'+line+'" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-linejoin="round"/>':'')
      +'<circle cx="'+tx.toFixed(1)+'" cy="'+ty.toFixed(1)+'" r="3.2" fill="#e5484d"/><text x="'+Math.min(W-PR,Math.max(PL+20,tx)).toFixed(1)+'" y="'+Math.max(10,ty-6).toFixed(1)+'" font-size="9.5" font-weight="700" text-anchor="middle" fill="#e5484d">최고 '+eo(top[1])+'</text>'
      +'<text x="'+(W-PR)+'" y="'+(H-PB+12)+'" font-size="8.5" text-anchor="end" fill="#94a3b8">거래량</text></svg>'
      +'<div class="dxlegend"><span><i></i>실거래</span>'
      +(showMedianLine?'<span><i class="line"></i>최근 3개월 실거래 중위가</span>':'')
      +'<span><i class="bar"></i>거래량</span><span class="source">최근 3개월 3건 이상 · 직거래 및 이상거래 제외</span></div>'
      +(hasGap?'<p class="dxgap-note">거래 기록이 없는 달은 자료 누락 여부를 별도로 확인해야 합니다.</p>':'');
  }

  function drawDx(d,j,box,selectedArea,floorMode,omitDirect){
    var all=j.t||[];markOdd(all);var A=selectedArea==null?pickAb(d,j):+selectedArea;
    floorMode=floorMode||'all';omitDirect=!!omitDirect;
    var areaRows=all.filter(function(t){return ab(t[1])===A;});
    var maxFloor=areaRows.reduce(function(n,t){return Math.max(n,t[2]);},0);
    var floor1=Math.max(1,Math.floor(maxFloor/3)),floor2=Math.max(floor1,Math.floor(maxFloor*2/3));
    var rows=areaRows.filter(function(t){return (floorMode==='all'||(floorMode==='low'&&t[2]<=floor1)||(floorMode==='mid'&&t[2]>floor1&&t[2]<=floor2)||(floorMode==='high'&&t[2]>floor2))&&(!omitDirect||!bad(t));});
    var areaOptions=Array.from(new Set(all.map(function(t){return ab(t[1]);}))).sort(function(a,b){return a-b;});
    var now=Date.now(), lcPy={}; (j.lc||[]).forEach(function(x){ lcPy[x[0]]=x[1]; });
    var chip=function(cls,val,on,label,sub){ return '<button type="button" class="dxc1 '+cls+(on?' on':'')+'" data-v="'+val+'" aria-pressed="'+on+'">'+label+(sub?'<small>'+sub+'</small>':'')+'</button>'; };
    var h='<section class="sec" data-dx="1"><h3>실거래가 <small>국토부 신고 · 해제 제외</small></h3>';
    if(areaOptions.length>1) h+='<div class="dxrow" role="group" aria-label="평형">'+areaOptions.map(function(v){ return chip('dxa',v,v===A,lcPy[v]?lcPy[v]+'평':v+'㎡대',lcPy[v]?'전용 '+v+'㎡':''); }).join('')+'</div>';
    if(!rows.length) h+='<p class="note">선택 조건에 맞는 실거래가 없습니다.</p>';
    if(rows.length){
      var nd=rows.filter(function(t){return !bad(t);}); if(!nd.length) nd=rows;
      var last=nd[nd.length-1], peak=nd.reduce(function(a,t){return t[3]>a[3]?t:a;},nd[0]);
      var r3=nd.filter(function(t){var ms=tms(t[0]);return ms>=now-TREND_WINDOW&&ms<=now;}).map(function(t){return t[3];});
      var y3=nd.filter(function(t){var m=tms(t[0]);return m>=now-456*864e5&&m<now-365*864e5;}).map(function(t){return t[3];});
      var m3=med(r3), my=med(y3), cur=m3!=null?m3:last[3];
      var pill=function(txt,v){ return '<span class="dxpill '+(v>=0?'up':'dn')+'">'+txt+' <b>'+(v>=0?'▲':'▼')+' '+Math.abs(v*100).toFixed(1)+'%</b></span>'; };
      var ev=typeof priceEv==='function'&&priceEv(d);
      var rankPrice=A===listedAb(d,j)&&d.p>0&&!d.opt?'<p class="dxnote">순위용 추정 시세 <strong>'+won(d.p)+'</strong>'
        +(ev?' · 순위 자료 최근 3개월 '+ev.n3+'건 / 12개월 '+ev.n+'건':'')+' · 추정 시세와 아래 실거래 집계 기준은 다를 수 있습니다.</p>':'';
      h+='<div class="dxhero">'+rankPrice+'<div class="lbl">'+(m3!=null?(r3.length>=3?'최근 3개월 실거래 중위 · '+r3.length+'건':'최근 3개월 실거래 '+r3.length+'건'+(r3.length>1?' 중위':'')):'마지막 실거래 · '+ymd(last[0]))+(floorMode!=='all'||omitDirect?' · 필터 적용':'')+'</div>'
        +'<div class="big tnum">'+won(cur)+'</div><div class="pills">'
        +(cur>=peak[3]?'<span class="dxpill up"><b>최고가와 동일</b></span>':pill('최고가 대비',cur/peak[3]-1))
        +(my!=null&&m3!=null?pill('1년 전 대비',m3/my-1):'')+'</div>'
        +'<div class="mini tnum">최고 <b>'+won(peak[3])+'</b> '+ymd(peak[0])+' · '+peak[2]+'층</div></div>'
        +'<div class="dxseg dxp" role="group" aria-label="기간">'+['3','5','all'].map(function(p,i){return '<button type="button" data-p="'+p+'" aria-pressed="'+(i===0)+'"'+(i===0?' class="on"':'')+'>'+(p==='all'?'전체':p+'년')+'</button>';}).join('')+'</div>'
        +'<div class="dxc">'+chart(rows,3)+'</div>';
      // 층별: 누르면 그 층만(다시 누르면 전체)
      var aNd=areaRows.filter(function(t){return !bad(t)&&tms(t[0])>=now-365*864e5;});
      if(maxFloor>=3&&aNd.length>=3){
        var G=[['low','저층','1~'+floor1+'층'],['mid','중층',(floor1+1)+'~'+floor2+'층'],['high','고층',(floor2+1)+'층~']];
        h+='<h4 class="dxh">층별 가격 <small>최근 12개월 중위 · 누르면 그 층만</small></h4><div class="dxtiles tnum">'
          +G.map(function(g){ var v=aNd.filter(function(t){return g[0]==='low'?t[2]<=floor1:g[0]==='mid'?t[2]>floor1&&t[2]<=floor2:t[2]>floor2;}).map(function(t){return t[3];});
            return '<button type="button" class="dxtile dxf'+(floorMode===g[0]?' on':'')+'" data-v="'+g[0]+'"><span>'+g[1]+' <small>'+g[2]+'</small></span><b>'+(v.length?won(med(v)):'—')+'</b><small>'+v.length+'건</small></button>'; }).join('')+'</div>';
      }
      // 최근 실거래 3건 + 더보기
      var mx=0, flag=rows.map(function(t){ var n=t[3]>mx&&!bad(t); if(!bad(t)) mx=Math.max(mx,t[3]); return n; });
      var list=rows.map(function(t,i){return [t,flag[i]];}).reverse();
      var tr=function(n){ return list.slice(0,n).map(function(x){ var t=x[0]; return '<div class="dxr"><div class="l"><b>'+won(t[3])+(x[1]?'<i class="nw">신고가</i>':'')+(t[4]?'<i class="dg">직거래</i>':t[5]?'<i class="dg">이상 거래 의심</i>':'')+'</b><span>'+ymd(t[0])+' · '+t[2]+'층 · 전용 '+t[1]+'㎡</span></div></div>'; }).join(''); };
      h+='<div class="dxh dxhrow"><span>최근 실거래 <small>'+rows.length.toLocaleString()+'건</small></span><label class="dxtg"><input class="dxndirect" type="checkbox" '+(omitDirect?'checked':'')+'>직거래·이상거래 빼기</label></div>'
        +'<div class="dxl dxt tnum">'+tr(3)+'</div>'
        +(list.length>3?'<button type="button" class="dxmore dxm">실거래 '+(list.length-3).toLocaleString()+'건 더보기</button>':'');
    }
    h+='</section>';
    // 평형별 시세·단지 정보는 상세의 '전체 평형별 시세'·'단지 기본정보'와 겹쳐서 뺌
    // 같은 동 전체 평당 시세 순위
    var me=(lkey(d)||'').split('|').slice(2).join('|');
    var nb=(j.nb||[]).filter(function(x){return x[4]==null||x[4]>=100||x[0]===me;});
    if(nb.length>1){
      var at=-1; nb.forEach(function(x,i){ if(x[0]===me) at=i; });
      var dong=String(d.area).split(' ').pop(), show=nb.slice(0,5); if(at>=5) show.push(nb[at]);
      var NBROW=function(x){ var i=nb.indexOf(x), sub=[x[4]?Number(x[4]).toLocaleString()+'세대':'',/^\d{4}$/.test(String(x[5]||'').trim())?String(x[5]).trim()+'년 입주':''].filter(Boolean).join(' · ');
          return '<div class="dxr'+(x[0]===me?' me':'')+'"><em class="no">'+(i+1)+'</em><div class="l"><b>'+E(x[0])+(x[0]===me?'<i class="tag">이 단지</i>':'')+'</b>'+(sub?'<span>'+sub+'</span>':'')+'</div><div class="r">'+Math.round(x[2]/x[1]).toLocaleString()+'만<small>평당</small></div></div>'; };
      h+='<section class="sec" data-dx="1"><h3>'+E(dong)+' 평당 시세 순위 <small>가격대 무관 · 100세대 이상</small></h3>'
        +(at>=0?'<p class="dxk"><b>'+nb.length+'곳 중 '+(at+1)+'위</b></p>':'')
        +'<div class="dxl dxnb tnum">'+show.map(NBROW).join('')        +'</div>'+(nb.length>show.length?'<button type="button" class="dxmore dxnbm">'+E(dong)+' '+nb.length+'곳 전체 보기</button>':'')+'<p class="note">단지마다 거래가 가장 많은 평형의 실거래 환산 시세 ÷ 평. 작은 평형 위주 단지는 평당가가 높게 나와요.</p></section>';
    }
    if(!h){ box.innerHTML=''; return; }
    box.innerHTML=h;
    var redraw=function(area,fm,od){ drawDx(d,j,box,area,fm,od); };
    box.querySelectorAll('.dxa').forEach(function(b){ b.onclick=function(){ redraw(+b.dataset.v,'all',omitDirect); }; });
    box.querySelectorAll('.dxf').forEach(function(b){ b.onclick=function(){ redraw(A,floorMode===b.dataset.v?'all':b.dataset.v,omitDirect); }; });
    var nd0=box.querySelector('.dxndirect'); if(nd0) nd0.onchange=function(){ redraw(A,floorMode,nd0.checked); };
    box.querySelectorAll('[data-dx-unit]').forEach(function(b){var go=function(){drawDx(d,j,box,+b.dataset.dxUnit,'all',false);};b.onclick=go;b.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}};});
    box.querySelectorAll('.dxp button').forEach(function(b){ b.onclick=function(){
      box.querySelectorAll('.dxp button').forEach(function(o){ o.setAttribute('aria-pressed','false'); o.classList.remove('on'); });
      b.setAttribute('aria-pressed','true'); b.classList.add('on');
      box.querySelector('.dxc').innerHTML=chart(rows,b.dataset.p==='all'?'all':+b.dataset.p); }; });
    var nbm=box.querySelector('.dxnbm'); if(nbm) nbm.onclick=function(){ box.querySelector('.dxnb').innerHTML=nb.map(NBROW).join(''); nbm.remove(); };
    var more=box.querySelector('.dxm'), n=3;
    if(more) more.onclick=function(){ n+=20; more.textContent='실거래 '+Math.max(0,list.length-n).toLocaleString()+'건 더보기'; box.querySelector('.dxt').innerHTML=tr(n); if(n>=list.length) more.remove(); };
  }

  // 같은 실거래 원본을 상세 화면과 '실거래 차트' 메뉴에서 재사용한다.
  window.APTDXChart=function(d,j,el){
    if(!el)return;
    var all=Array.isArray(j&&j.t)?j.t:[], A=pickAb(d,j||{}), rows=all.filter(function(t){return ab(t[1])===A;});
    markOdd(rows);
    if(!rows.length){el.innerHTML='<p class="ru-warning">이 단지의 해당 평형 과거 실거래 내역이 없습니다. 자료 누락 가능성도 확인해야 합니다.</p>';return;}
    el.innerHTML='<div class="dxseg dxp" role="group" aria-label="실거래 차트 기간"><button type="button" data-p="3" class="on" aria-pressed="true">3년</button><button type="button" data-p="5" aria-pressed="false">5년</button><button type="button" data-p="all" aria-pressed="false">전체</button></div><div class="dxc">'+chart(rows,3)+'</div>';
    el.querySelectorAll('.dxp button').forEach(function(btn){btn.onclick=function(){
      el.querySelectorAll('.dxp button').forEach(function(x){x.classList.remove('on');x.setAttribute('aria-pressed','false');});
      btn.classList.add('on');btn.setAttribute('aria-pressed','true');
      el.querySelector('.dxc').innerHTML=chart(rows,btn.dataset.p==='all'?'all':Number(btn.dataset.p));
    };});
  };
  window.APTDX=function(d,body){
    if(!body)return;
    var k=lkey(d);
    body.querySelectorAll('.dxbox').forEach(function(x){x.remove();});
    var box=document.createElement('div');box.className='dxbox';
    var loading=function(){box.innerHTML='<section class="sec" data-dx="1"><h3>실거래가 <small>과거 거래 및 가격 추이</small></h3><p class="note">실거래 차트 불러오는 중…</p></section>';};
    var error=function(msg){if(!box.isConnected)return;
      box.innerHTML='<section class="sec" data-dx="1"><h3>실거래가 <small>가격 추이</small></h3><p class="note">'+E(msg)+'</p><button type="button" class="dx-retry" style="margin-top:10px;padding:10px 15px;min-height:42px;border:1px solid var(--border);background:var(--bg-subtle);border-radius:6px;color:var(--primary-soft-fg);font-size:13px;font-weight:750">실거래 차트 다시 불러오기</button></section>';
      var btn=box.querySelector('.dx-retry');if(btn)btn.onclick=function(){window.APTDX(d,body);};
      if(window.aptLayout)aptLayout(body);
    };
    loading();
    var anchor=null;body.querySelectorAll('section.sec > h3').forEach(function(h){if(!anchor&&/^(시세 흐름|사면 드는 돈)/.test(h.textContent.trim()))anchor=h.parentNode;});
    if(anchor)anchor.parentNode.insertBefore(box,anchor);else{var id=body.querySelector('.identity');(id&&id.nextSibling)?id.parentNode.insertBefore(box,id.nextSibling):body.appendChild(box);}
    if(!k){error('단지 식별정보를 찾지 못해 실거래 차트를 표시할 수 없습니다.');return;}
    var done=function(j){if(!box.isConnected)return;
      if(!j||!Array.isArray(j.t)){error('실거래 응답이 올바르지 않습니다.');return;}
      try{drawDx(d,j,box);window.APT_DX_INFO=window.APT_DX_INFO||{};window.APT_DX_INFO[k]=j;if(window.AP1X)window.AP1X.onDx(d,j,body);if(window.aptLayout)aptLayout(body);}
      catch(e){console.error('apt-dx chart render failed',e);error('실거래 자료를 받았지만 차트를 표시하지 못했습니다.');}
    };
    if(CACHE[k])return done(CACHE[k]);
    fetch('/api/apt-dx?v=3&k='+encodeURIComponent(k)).then(function(r){if(!r.ok)throw Error('HTTP '+r.status);return r.json();})
      .then(function(j){CACHE[k]=j;done(j);})
      .catch(function(e){console.warn('apt-dx request failed',k,e);error('실거래 정보를 불러오지 못했습니다. 데이터가 없다는 뜻은 아닙니다.');});
  };

  window.APTRACE=function(){
    if(window.RACE_LOADING) return; window.RACE_LOADING=1;
    fetch('/api/apt-race?v=3').then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(m){ if(!m||!Object.keys(m).length) throw 0;
      window.RACE=m||{};
      D.forEach(function(d){ var a=m[lkey(d)]||[], r=null; for(var i=0;i<a.length;i++){ if(Math.abs(a[i][0]-d.py)<=1&&(!r||Math.abs(a[i][0]-d.py)<Math.abs(r[0]-d.py))) r=a[i]; } d.rc=r?r[2]/r[1]-1:null; d.rcAmt=r?r[2]-r[1]:null; d.rcN=r?r[3]:null; });
      if(window.aptRerenderList) window.aptRerenderList();
    }).catch(function(){ window.RACE_LOADING=0; });
  };
})();
