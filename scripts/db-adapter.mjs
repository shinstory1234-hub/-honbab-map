/**
 * DB 추상화 레이어
 * SQLite → Supabase/PostgreSQL 등으로 교체하려면 이 파일만 수정하면 됩니다.
 *
 * 인터페이스:
 *   adapter.init()         — 테이블 생성 등 초기화
 *   adapter.upsert(place)  — 신규면 삽입, 기존이면 스킵. 신규 삽입 시 true 반환
 *   adapter.count()        — 현재 저장된 총 레코드 수
 *   adapter.close()        — 연결 종료
 */

import { mkdirSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const DB_PATH = './data/kakao-restaurants.sqlite'

export function createDbAdapter() {
  let db
  let insertStmt

  return {
    init() {
      mkdirSync('./data', { recursive: true })

      // better-sqlite3는 동기 드라이버라 스크립트에서 쓰기 편함
      const Database = require('better-sqlite3')
      db = new Database(DB_PATH)

      // WAL 모드: 쓰기 성능 향상
      db.pragma('journal_mode = WAL')

      db.exec(`
        CREATE TABLE IF NOT EXISTS places (
          place_id            TEXT PRIMARY KEY,
          place_name          TEXT NOT NULL,
          category_name       TEXT,
          category_group_code TEXT,
          category_group_name TEXT,
          phone               TEXT,
          address_name        TEXT,
          road_address_name   TEXT,
          x                   TEXT,
          y                   TEXT,
          place_url           TEXT,
          collected_at        TEXT DEFAULT (datetime('now', 'localtime'))
        );

        CREATE INDEX IF NOT EXISTS idx_places_category ON places(category_group_code);
        CREATE INDEX IF NOT EXISTS idx_places_coords   ON places(y, x);
      `)

      // 미리 컴파일 (반복 삽입 성능)
      insertStmt = db.prepare(`
        INSERT OR IGNORE INTO places
          (place_id, place_name, category_name, category_group_code, category_group_name,
           phone, address_name, road_address_name, x, y, place_url)
        VALUES
          (@place_id, @place_name, @category_name, @category_group_code, @category_group_name,
           @phone, @address_name, @road_address_name, @x, @y, @place_url)
      `)

      console.log(`[DB] 초기화 완료 → ${DB_PATH}`)
    },

    /**
     * place_id 기준 중복 제거 (INSERT OR IGNORE)
     * @returns {boolean} true = 신규 삽입, false = 중복 스킵
     */
    upsert(place) {
      const result = insertStmt.run(place)
      return result.changes > 0
    },

    count() {
      return db.prepare('SELECT COUNT(*) AS cnt FROM places').get().cnt
    },

    close() {
      const total = this.count()
      console.log(`[DB] 총 저장: ${total.toLocaleString()}개`)
      db.close()
    },
  }
}
