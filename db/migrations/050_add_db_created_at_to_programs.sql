-- Add db_created_at column to programs table
alter table programs add column if not exists db_created_at timestamptz not null default now();

-- Add db_created_at column to program_versions table
alter table program_versions add column if not exists db_created_at timestamptz not null default now();
