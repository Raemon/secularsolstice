alter table programs
add column if not exists program_ids uuid[] not null default '{}'::uuid[];





