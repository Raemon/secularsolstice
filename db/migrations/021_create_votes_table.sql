-- Create votes table
create table if not exists votes (
  id uuid not null default gen_random_uuid(),
  name text not null,
  weight integer not null,
  type text not null,
  version_id uuid not null,
  created_at timestamptz not null default now(),
  constraint votes_pkey PRIMARY KEY (id),
  constraint votes_version_id_fkey FOREIGN KEY (version_id) REFERENCES song_versions(id) ON DELETE CASCADE
);

CREATE INDEX if not exists votes_version_id_idx on votes USING btree (version_id);


