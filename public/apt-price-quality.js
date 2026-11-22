/* 순위용 실거래 검증. 원본 거래와 환산 시세는 수정하지 않는다. */
(function(root){
  function review(rows,asOf,verifiedCount=r=>r[2]){
    const ordered=rows.filter(r=>r[0]>0&&r[1]>0).sort((a,b)=>a[0]-b[0]);
    const held=new Set(), stale=new Set(), pairs=[];
    const thin=r=>verifiedCount(r)>0&&verifiedCount(r)<=2&&r[3]===0;
    for(let i=0;i<ordered.length;i++){
      const small=ordered[i];
      for(let j=i+1;j<ordered.length;j++){
        const big=ordered[j], gap=big[0]-small[0];
        if(big[0]>small[0]*1.4&&gap>8)break;
        if(gap<=0)continue;
        const inverse=big[1]<=small[1]*.88;
        const jump=big[1]*small[0]>=small[1]*big[0]*1.35;
        if(inverse||jump)pairs.push([small,big]);
        if(inverse){
          // 양쪽이 단일 계약이면 계약은 보존하고 두 평형의 확정 순위만 보류한다.
          if(verifiedCount(small)===1&&verifiedCount(big)===1){held.add(small);held.add(big);}
          if(thin(big)&&(verifiedCount(small)>=3||thin(small)))held.add(big);
          if(thin(small)&&(verifiedCount(big)>=3||thin(big)))held.add(small);
        }
        // 가까운 두 평형의 평당가가 크게 벌어지면 검증 가능한 쪽을 남긴다.
        const ratio=(big[1]*small[0])/(small[1]*big[0]);
        if(gap<=8||gap<=14&&big[0]<=small[0]*1.3){
          if(thin(big)&&verifiedCount(small)>=5&&(ratio<.78||ratio>1.35))held.add(big);
          if(thin(small)&&verifiedCount(big)>=5&&(ratio>1/.78||ratio<1/1.35))held.add(small);
        }
      }
    }
    const limit=Date.parse(asOf)-180*86400000;
    for(const flat of ordered){
      if(held.has(flat)||!thin(flat)||verifiedCount(flat)!==1||!(Date.parse(flat[4])<limit))continue;
      // 오래된 한 건이라도 최근 인접 평형 거래가 같은 가격 수준을 지지하면 유지한다.
      const corroborated=ordered.some(peer=>peer!==flat&&!held.has(peer)&&peer[3]>0&&verifiedCount(peer)>=3
        &&Math.abs(peer[0]-flat[0])<=8&&Math.abs(flat[1]*peer[0]/(peer[1]*flat[0])-1)<=.18);
      if(!corroborated){held.add(flat);stale.add(flat);}
    }
    const conflicts=new Set();
    for(const [small,big] of pairs){
      if(held.has(small)||held.has(big))continue;
      conflicts.add(small[0]); conflicts.add(big[0]);
    }
    return {rows:held.size?rows.filter(r=>!held.has(r)):rows,held,stale,conflicts};
  }

  // 같은 관할의 정확한 이름 우선. 읍·면 리 표기 또는 행정구역 개편은 후보가 하나일 때만 인정한다.
  function matcher(feed){
    let indexes;
    const keys=key=>{
      const [sgg,dong,...name]=key.split('|');
      const tail=String(dong||'').split(' ')[0]+'|'+name.join('|');
      return [sgg+'|'+tail,sgg.slice(0,2)+'|'+tail];
    };
    return key=>{
      if(!key)return null;
      if(Object.hasOwn(feed,key))return key;
      if(!indexes){
        indexes=[new Map(),new Map()];
        for(const source of Object.keys(feed)){
          keys(source).forEach((k,i)=>{
            const idx=indexes[i];
            idx.set(k,idx.has(k)?null:source);
          });
        }
      }
      const [local,regional]=keys(key);
      return indexes[0].has(local)?indexes[0].get(local):indexes[1].get(regional)||null;
    };
  }
  root.APT_PRICE_QUALITY={review,matcher};
})(typeof window==='undefined'?globalThis:window);
