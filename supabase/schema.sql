-- restaurants 테이블
create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lat float8 not null,
  lng float8 not null,
  category text not null default '기타',
  honbab_level int2 not null check (honbab_level in (1, 2, 3)),
  honbab_tags text[] default '{}',
  created_at timestamptz default now()
);

-- honbab_reports 테이블
create table if not exists honbab_reports (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  reported_level int2 not null check (reported_level in (1, 2, 3)),
  comment text default '',
  created_at timestamptz default now()
);

-- RLS 활성화
alter table restaurants enable row level security;
alter table honbab_reports enable row level security;

-- 누구나 읽기 가능
create policy "anyone can read restaurants" on restaurants for select using (true);
create policy "anyone can insert restaurants" on restaurants for insert with check (true);

create policy "anyone can read reports" on honbab_reports for select using (true);
create policy "anyone can insert reports" on honbab_reports for insert with check (true);

-- 더미 데이터 10개
insert into restaurants (name, address, lat, lng, category, honbab_level, honbab_tags) values
  ('이치란 라멘 홍대점', '서울 마포구 어울마당로 35', 37.5578, 126.9247, '라멘', 1, ARRAY['카운터석', '1인 메뉴 있음', '혼밥 손님 많음']),
  ('스시로 합정점', '서울 마포구 양화로 188', 37.5493, 126.9145, '스시', 1, ARRAY['1인석', '카운터석']),
  ('교촌치킨 신촌점', '서울 서대문구 신촌로 83', 37.5555, 126.9368, '치킨', 2, ARRAY['조용한분위기']),
  ('마포갈매기 합정점', '서울 마포구 토정로 37', 37.5498, 126.9129, '고기', 3, ARRAY[]),
  ('혼밥식당 연남점', '서울 마포구 연남동 241-23', 37.5631, 126.9215, '한식', 1, ARRAY['1인석', '혼밥 손님 많음', '빠른회전']),
  ('토마토 파스타', '서울 마포구 동교로 240', 37.5583, 126.9254, '파스타', 2, ARRAY['조용한분위기', '1인 메뉴 있음']),
  ('황금돼지 삼겹살', '서울 마포구 홍대입구역 3번 출구', 37.5570, 126.9230, '고기', 3, ARRAY[]),
  ('덮밥하우스', '서울 마포구 성미산로 170', 37.5601, 126.9289, '덮밥', 1, ARRAY['카운터석', '빠른회전', '1인 메뉴 있음']),
  ('명동칼국수 마포점', '서울 마포구 대흥로 29', 37.5519, 126.9393, '칼국수', 2, ARRAY['혼밥 손님 많음']),
  ('스태프 카레', '서울 마포구 잔다리로 47', 37.5563, 126.9181, '카레', 1, ARRAY['카운터석', '1인 메뉴 있음', '조용한분위기']);
