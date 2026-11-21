/* 순위용 실거래 검증. 원본 거래와 환산 시세는 수정하지 않는다. */
(function(root){
  function review(rows){
    const ordered=rows.filter(r=>r[0]>0&&r[1]>0).sort((a,b)=>a[0]-b[0]);
    const held=new Set(), pairs=[];
    const thin=r=>r[2]>0&&r[2]<=2&&r[3]===0;
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
          if(thin(big)&&(small[2]>=3||thin(small)))held.add(big);
          if(thin(small)&&(big[2]>=3||thin(big)))held.add(small);
        }
        // 면적이 비슷하고 거래가 충분한 비교 평형이 있을 때만 단독 저가를 보류한다.
        if(gap<=8){
          if(thin(big)&&small[2]>=5&&big[1]*small[0]<small[1]*big[0]*.78)held.add(big);
          if(thin(small)&&big[2]>=5&&small[1]*big[0]<big[1]*small[0]*.78)held.add(small);
        }
      }
    }
    const conflicts=new Set();
    for(const [small,big] of pairs){
      if(held.has(small)||held.has(big))continue;
      conflicts.add(small[0]); conflicts.add(big[0]);
    }
    return {rows:held.size?rows.filter(r=>!held.has(r)):rows,held,conflicts};
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
