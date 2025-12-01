create extension if not exists "pgcrypto";

create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now(),
  archived boolean not null default false,
  created_by text
);

create unique index if not exists songs_title_key on songs (title);
create index if not exists songs_archived_idx on songs (archived);

create table if not exists song_versions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references songs(id) on delete cascade,
  label text not null,
  content text,
  audio_url text,
  previous_version_id uuid references song_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  next_version_id uuid references song_versions(id) on delete set null,
  original_version_id uuid references song_versions(id) on delete set null,
  rendered_content jsonb,
  bpm integer,
  archived boolean not null default false,
  created_by text
);

create index if not exists song_versions_song_id_idx on song_versions (song_id);
create index if not exists song_versions_prev_version_idx on song_versions (previous_version_id);
create index if not exists song_versions_song_label_idx on song_versions (song_id, label);
create index if not exists song_versions_next_version_idx on song_versions (next_version_id);
create index if not exists song_versions_original_version_idx on song_versions (original_version_id);

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  element_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  archived boolean not null default false,
  created_by text
);

create index if not exists programs_title_idx on programs (title);
create index if not exists programs_archived_idx on programs (archived);


