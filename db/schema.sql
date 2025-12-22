create extension if not exists "pgcrypto";

create table if not exists comments (
  id uuid not null default gen_random_uuid(),
  version_id uuid not null,
  content text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  privacy text not null default 'public'::text,
  user_id uuid,
  constraint comments_pkey PRIMARY KEY (id),
  constraint comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  constraint comments_version_id_fkey FOREIGN KEY (version_id) REFERENCES song_versions(id) ON DELETE CASCADE
);

CREATE INDEX if not exists comments_created_at_idx on comments USING btree (created_at);
CREATE INDEX if not exists comments_privacy_idx on comments USING btree (privacy);
CREATE INDEX if not exists comments_user_id_idx on comments USING btree (user_id);
CREATE INDEX if not exists comments_version_id_idx on comments USING btree (version_id);

create table if not exists programs (
  id uuid not null default gen_random_uuid(),
  title text not null,
  element_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  archived boolean not null default false,
  created_by text,
  program_ids uuid[] not null default '{}'::uuid[],
  video_url text,
  print_program_foreword text,
  print_program_epitaph text,
  is_subprogram boolean not null default false,
  constraint programs_pkey PRIMARY KEY (id)
);

CREATE INDEX if not exists programs_archived_idx on programs USING btree (archived);
CREATE INDEX if not exists programs_title_idx on programs USING btree (title);

create table if not exists schema_migrations (
  filename text not null,
  checksum text not null,
  applied_at timestamptz not null default now(),
  constraint schema_migrations_pkey PRIMARY KEY (filename)
);

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
  transpose integer default 0,
  slide_credits text,
  program_credits text,
  slides_movie_url text,
  slide_movie_start integer,
  rendered_content jsonb,
  blob_url text,
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

create table if not exists users (
  id uuid not null default gen_random_uuid(),
  username text,
  created_at timestamptz not null default now(),
  performed_program_ids uuid[] not null default '{}'::uuid[],
  is_admin boolean not null default false,
  ever_set_username boolean not null default false,
  password_hash text,
  constraint users_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX if not exists users_username_key on users USING btree (username) WHERE (username IS NOT NULL);

create table if not exists votes (
  id uuid not null default gen_random_uuid(),
  weight integer not null,
  type text not null,
  version_id uuid not null,
  created_at timestamptz not null default now(),
  song_id uuid not null,
  category text not null default 'quality'::text,
  privacy text not null default 'public'::text,
  user_id uuid,
  constraint votes_pkey PRIMARY KEY (id),
  constraint votes_song_id_fkey FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
  constraint votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  constraint votes_version_id_fkey FOREIGN KEY (version_id) REFERENCES song_versions(id) ON DELETE CASCADE
);

CREATE INDEX if not exists votes_privacy_idx on votes USING btree (privacy);
CREATE INDEX if not exists votes_song_id_idx on votes USING btree (song_id);
CREATE INDEX if not exists votes_user_id_idx on votes USING btree (user_id);
CREATE INDEX if not exists votes_version_id_idx on votes USING btree (version_id);
CREATE UNIQUE INDEX if not exists votes_version_id_user_id_category_idx on votes USING btree (version_id, user_id, category) WHERE (user_id IS NOT NULL);
