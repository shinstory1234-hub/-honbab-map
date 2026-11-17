/* 국토교통부/K-apt 실거래 API: 외부 호출 없이 응답 파서와 경계 조건 회귀검증 */
import assert from 'node:assert/strict';
import { nameKey, textDecode, xmlTags, parseGovernment, validKey } from '../lib/apt-openapi.mjs';
assert.equal(nameKey('상계주공2(고층)'),nameKey('상계 주공2'));
assert.equal(nameKey('평촌어바인퍼스트 아파트'),nameKey('평촌어바인퍼스트'));
assert.equal(textDecode('A&amp;B &lt;test&gt;'),'A&B <test>');
assert.deepEqual(xmlTags('<deposit>43,500</deposit><monthlyRent>0</monthlyRent>'),{deposit:'43,500',monthlyRent:'0'});
const xml='<?xml version="1.0"?><response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header><body><items><item><aptNm>테스트아파트</aptNm><umdNm>비산동</umdNm><excluUseAr>59.9</excluUseAr><deposit>30,000</deposit><monthlyRent>0</monthlyRent></item></items><numOfRows>10</numOfRows><totalCount>1</totalCount></body></response>';
const r=parseGovernment(xml);
assert.equal(r.total,1);assert.equal(r.items.length,1);
assert.equal(r.items[0].deposit,'30,000');assert.equal(r.items[0].aptNm,'테스트아파트');
const json=JSON.stringify({response:{header:{resultCode:'00'},body:{items:{item:{kaptName:'검증단지',kaptdaCnt:'990'}},totalCount:1}}});
assert.equal(parseGovernment(json).items[0].kaptdaCnt,'990');
assert.throws(()=>parseGovernment('<OpenAPI_ServiceResponse><cmmMsgHeader><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>'),/UNEXPECTED_XML_RESPONSE/);
assert.throws(()=>parseGovernment('<response><header><resultCode>30</resultCode></header><body/></response>'),/PROVIDER_30/);
assert.equal(validKey('41173|비산동|평촌어바인퍼스트').dong,'비산동');
assert.equal(validKey('11110|<script>|X'),null);
assert.equal(validKey('abc|동|단지'),null);
console.log('PASS: 정부 API 형식·단지 키 검증 통과');
