alter table song_versions
  add column if not exists archived boolean not null default false;











