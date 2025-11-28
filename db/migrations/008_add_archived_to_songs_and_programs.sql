alter table songs
  add column if not exists archived boolean not null default false;

create index if not exists songs_archived_idx on songs (archived);

alter table programs
  add column if not exists archived boolean not null default false;

create index if not exists programs_archived_idx on programs (archived);


