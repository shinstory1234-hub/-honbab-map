#!/usr/bin/env node
/*
 * 20~25억·25~30억 탭은 6억 초과 공통 단지 풀에서 만들어진다.
 * 기존 6~20억 조사 파일에 이미 결합된 중학교/2025 공시를 합쳐
 * 새 탭에서도 같은 단지를 다시 조사하지 않고 쓸 수 있게 한다.
 */
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PUBLIC=path.join(ROOT,'public');
const schools={};
for(const cap of [10,15,20]){
  const window={};
  vm.runInNewContext(await fs.readFile(path.join(PUBLIC,`apt-invest${cap}.js`),'utf8'),{window});
  Object.assign(schools,window.APT_INV_SCHOOL||{});
}
for(const cap of [25,30]){
  const label=cap===25?'20~25억':'25~30억';
  const js=`/* 자동 생성: scripts/build-high-school-maps.mjs
   대상: ${label} 탭. 기존 6~20억 조사 단지의 가장 가까운 중학교·2025 공시 합집합.
   가장 가까운 학교는 배정 학교를 뜻하지 않는다. */
window.APT_INV_RANK=window.APT_INV_RANK||{}; window.APT_INV_RANK[${cap}]={};
window.APT_INV_SCHOOL=${JSON.stringify(schools)};
window.APT_INV_META=${JSON.stringify({asof:'2026-11-03',schoolPosition:'전국초중등학교위치표준데이터',schoolOutcome:'학교알리미 2025 공시',inherited:true,schoolComplexes:Object.keys(schools).length})};
`;
  await fs.writeFile(path.join(PUBLIC,`apt-invest${cap}.js`),js);
}
console.log(`school maps: ${Object.keys(schools).length} complexes -> cap 25, 30`);
