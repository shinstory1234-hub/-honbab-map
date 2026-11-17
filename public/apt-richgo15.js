/* 2026-11-18 리치고 10~15억 상위 300 단지 조사: 동일 단지 확인된 용적률 8곳 변경.
 * 근거: docs/richgo-10to15-top300-20261118.csv. 6억 이하 및 타 가격대는 변경 금지. */
(function(W){
 if(W.CAPT!==15||!W.FARD)return;
 const verified=[["파크리오|서울 송파구 신천동",283],["시범한양|성남 분당구 서현동",201],["시범우성|성남 분당구 서현동",191],["센트라스|서울 성동구 하왕십리동",312],["위례24단지(꿈에그린)|서울 송파구 장지동",194],["과천위버필드|과천시 원문동",227],["강남자곡 힐스테이트|서울 강남구 자곡동",177],["평촌센텀퍼스트|안양 동안구 호계동",282]];
 let applied=0;
 for(const [key,far] of verified){
   const record=W.FARD[key];
   if(!record)continue;
   record[0]=far;record[1]='리치고(직접대조)';applied++;
 }
 W.RICHGO15_APPLIED={verified:verified.length,applied};
})(window);
