/* Development source only: built production cap15 pack includes these values inline. */
(function(W){if(W.CAPT!==15)return;
const h=k=>{let z=5381;for(let i=0;i<k.length;i++)z=((z*33)^k.charCodeAt(i))>>>0;return z.toString(36).padStart(7,'0')};
const s='0mohqr507v1g18nw505l01kcozd05b15pat6808o0h30l0b05e12ty67g06b18cw6n004x0bvp9zh06h0odwb3j04x0qve6qp07f07789e907f1g2ojdn06d1pezpab0821fi11og070030sm2d0641bckjuw05w01z4lv905n0yks5xk07f0s8go390860k6gzfs07g0t6586806z0mzebk107u',m=new Map();for(let i=0;i<s.length;i+=10)m.set(s.slice(i,i+7),parseInt(s.slice(i+7,i+10),36));
for(const key in W.FARD){const far=m.get(h(key));if(far==null)continue;W.FARD[key][0]=far;W.FARD[key][1]='리치고';}
for(const d of W.PICKS||[])if(d.n==='힐스테이트신촌'&&d.area==='서울 서대문구 북아현동'&&d.year===2023)d.year=2020;
})(window);
