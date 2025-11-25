create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  element_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now()
);

create index if not exists programs_title_idx on programs (title);


