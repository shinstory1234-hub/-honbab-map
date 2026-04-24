import { readFileSync, writeFileSync } from 'fs'

const current = JSON.parse(readFileSync('./data/checkpoint.json', 'utf-8'))

const merged = new Set()

for (const key of current.completed) {
  const p = key.split(',')
  if (p.length === 2) merged.add('FD6,' + key)
  else merged.add(key)
}

console.log('최종 키 수:', merged.size)
writeFileSync('./data/checkpoint.json', JSON.stringify({ completed: [...merged] }, null, 0))
console.log('저장 완료')
