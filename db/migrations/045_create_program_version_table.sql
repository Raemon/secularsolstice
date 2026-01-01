-- Create program_version table to store versioned program data
-- Programs table will be simplified to only contain: id, created_at, created_by

create table if not exists program_versions (
  id uuid not null default gen_random_uuid(),
  program_id uuid not null,
  title text not null,
  element_ids uuid[] not null default '{}'::uuid[],
  archived boolean not null default false,
  program_ids uuid[] not null default '{}'::uuid[],
  video_url text,
  print_program_foreword text,
  print_program_epitaph text,
  is_subprogram boolean not null default false,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint program_versions_pkey PRIMARY KEY (id),
  constraint program_versions_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

CREATE INDEX if not exists program_versions_program_id_idx on program_versions USING btree (program_id);
CREATE INDEX if not exists program_versions_archived_idx on program_versions USING btree (archived);
CREATE INDEX if not exists program_versions_lower_title_idx on program_versions USING btree (lower(title));
CREATE INDEX if not exists program_versions_title_idx on program_versions USING btree (title);
