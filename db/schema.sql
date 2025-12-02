create extension if not exists "pgcrypto";

create table if not exists programs (
  id uuid not null default gen_random_uuid(),
  title text not null,
  element_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  archived boolean not null default false,
  created_by text,
  program_ids uuid[] not null default '{}'::uuid[],
  constraint programs_pkey PRIMARY KEY (id)
);

CREATE INDEX if not exists programs_archived_idx on programs USING btree (archived);
CREATE INDEX if not exists programs_title_idx on programs USING btree (title);

create table if not exists song_versions (
  id uuid not null default gen_random_uuid(),
  song_id uuid not null,
  label text not null,
  content text,
  audio_url text,
  previous_version_id uuid,
  created_at timestamptz not null default now(),
  next_version_id uuid,
  original_version_id uuid,
  bpm integer,
  archived boolean not null default false,
  created_by text,
  rendered_content jsonb,
  transpose integer default 0,
  constraint song_versions_next_version_id_fkey FOREIGN KEY (next_version_id) REFERENCES song_versions(id) ON DELETE SET NULL,
  constraint song_versions_original_version_id_fkey FOREIGN KEY (original_version_id) REFERENCES song_versions(id) ON DELETE SET NULL,
  constraint song_versions_pkey PRIMARY KEY (id),
  constraint song_versions_previous_version_id_fkey FOREIGN KEY (previous_version_id) REFERENCES song_versions(id) ON DELETE SET NULL,
  constraint song_versions_song_id_fkey FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE INDEX if not exists song_versions_next_version_idx on song_versions USING btree (next_version_id);
CREATE INDEX if not exists song_versions_original_version_idx on song_versions USING btree (original_version_id);
CREATE INDEX if not exists song_versions_prev_version_idx on song_versions USING btree (previous_version_id);
CREATE INDEX if not exists song_versions_song_id_idx on song_versions USING btree (song_id);
CREATE INDEX if not exists song_versions_song_label_idx on song_versions USING btree (song_id, label);

create table if not exists songs (
  id uuid not null default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now(),
  archived boolean not null default false,
  created_by text,
  tags text[] not null default '{}'::text[],
  constraint songs_pkey PRIMARY KEY (id)
);

CREATE INDEX if not exists songs_archived_idx on songs USING btree (archived);
CREATE UNIQUE INDEX if not exists songs_title_key on songs USING btree (title);
