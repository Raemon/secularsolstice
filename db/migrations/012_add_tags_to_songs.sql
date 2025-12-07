alter table songs
add column if not exists tags text[] not null default '{}'::text[];


