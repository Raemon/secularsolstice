create table if not exists comments (
  id uuid not null default gen_random_uuid(),
  version_id uuid not null,
  content text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  constraint comments_pkey PRIMARY KEY (id),
  constraint comments_version_id_fkey FOREIGN KEY (version_id) REFERENCES song_versions(id) ON DELETE CASCADE
);

CREATE INDEX if not exists comments_version_id_idx on comments USING btree (version_id);
CREATE INDEX if not exists comments_created_at_idx on comments USING btree (created_at);

