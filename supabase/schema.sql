-- 도전행동 기록판 — 기기 간 동기화용 스키마
-- Supabase 프로젝트의 SQL Editor에 붙여넣고 한 번 실행하세요.

-- 모든 자료를 한 테이블에 담는다.
-- kind = 종류(student/behavior/period/record/setting/history), id = 그 종류 안에서의 식별자.
-- 실제 내용은 data(jsonb)에 그대로 넣어서, 앱에 항목이 추가돼도 테이블을 고칠 필요가 없다.
create table if not exists public.items (
  kind text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);

-- 실시간 반영을 위해 변경 사항을 publication에 포함시킨다
alter publication supabase_realtime add table public.items;

-- 삭제된 행도 실시간으로 알 수 있도록 이전 값을 함께 보낸다
alter table public.items replica identity full;

-- ⚠️ 학생 실명이 저장되므로 로그인한 사용자만 접근할 수 있어야 한다.
-- 이 정책이 없으면 주소를 아는 누구나 학생 정보를 읽을 수 있다.
alter table public.items enable row level security;

drop policy if exists "authenticated can read" on public.items;
create policy "authenticated can read"
  on public.items for select
  to authenticated
  using (true);

drop policy if exists "authenticated can write" on public.items;
create policy "authenticated can write"
  on public.items for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated can update" on public.items;
create policy "authenticated can update"
  on public.items for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated can delete" on public.items;
create policy "authenticated can delete"
  on public.items for delete
  to authenticated
  using (true);
