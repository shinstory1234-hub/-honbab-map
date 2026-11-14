/* 30억 이상 탭 보충(2026.11.15): 기존 30억 이하 유니버스에는 아예 존재하지 않던 고가 전용 단지.
   래미안원베일리의 단지정보: 서울 서초구 반포대로 333, 2023년, 2,990세대, 용적률 299%, 37.506799 / 126.998185.
   34평(전용 84.98㎡) 2026.11.13 KB 일반시세 59억 5천, 2026.10.14 국토부 최신 계약 57억.
   그 외 평형은 2026.11.13 국토부 신고 거래 중심값 또는 최신 계약가로서 '호가'나 실매수가 확정값이 아니다.
   참고: https://kbland.kr/se/c/381587
   https://aptchu.com/apt/11650-5126
   https://mola.kr/transactions/apartments/7d094523-c49c-4877-acf5-e624435a2ac1
   https://www.aldongsan.com/aptview.php?id=142155
   6~30억 데이터 불변. 30억 이상 전체 재수집은 미완료. */
(function(){
 if(window.CAPT!==35||!Array.isArray(window.PICKS))return;
 const n='래미안원베일리',area='서울 서초구 반포동',k=n+'|'+area;
 if(window.PICKS.some(d=>d.n===n&&d.area===area))return;
 const py=34,p=595000,lat=37.506799,lng=126.998185;
 const types=[
   {py:24,p:480000,last:'2026.09.12'}, // 3개월 실거래 중위
   {py:34,p:595000,last:'2026.10.14'}, // KB 일반시세 / 최근 실거래 57억
   {py:41,p:717500,last:'2026.10.08'}, // 1년 실거래 중위
   {py:47,p:940000,last:'2026.09.21'}, // 최근 정상 계약가
   {py:54,p:977500,last:'2026.09.22'}, // 6개월 실거래 중위(133~134㎡)
   {py:67,p:1260000,last:'2026.06.15'} // 2026년 6월 두 건의 중위
 ];
 const format=v=>{const a=Math.floor(v/10000),b=v%10000;return a+'억'+(b?' '+b.toLocaleString()+'만':'');};
 window.PICKS.push({n,s:'래미안원베일리',area,q:'래미안원베일리 반포동',tags:[],py,p,reg:'toheo',year:2023,units:2990,
   rate:{v:.2,src:'e',gu:'서초구'},tb:15,tbj:'강남',st:0,c:0,c_label:'고가 단지 실거래 보충',
   headline:'34평 '+format(p)+' · KB 일반시세(2026.11.13)',
   sub:'2023년 준공 2,990세대. 34평 KB 일반시세 59억 5,000만원(2026.11.13). 최근 신고 실거래 57억원(2026.10.14).',
   deal:'KB부동산 일반시세(2026.11.13) 59억 5,000만원. 최근 신고 계약 57억원(2026.10.14). 다른 평형은 최근 신고 거래 중위 또는 최근 계약 참고가로 실제 매수 가능가격과 다를 수 있음.',
   check:['2026.11 기준 공식 실거래 및 KB 시세 교차 확인','전용 면적·층·향에 따른 거래가격 차이가 큼','30억 이상 유니버스 전체 전수조사는 별도 필요'],
   timeline:[],fit:[],auto:1,u:1,lat,lng,types
 });
 const U=window.UGEO=window.UGEO||{};
 U[k]={lat,lng,cat:'아파트',st:410,stn:'신반포역',sts:[['신반포역 9호선',410],['고속터미널역 9호선',540],['고속터미널역 3호선',540],['고속터미널역 7호선',540]],sc:670};
 const F=window.FARD=window.FARD||{};
 F[k]=[299,'공동주택 확인자료',null,null,null,null,'11650'];
})();
