ALTER TABLE users ADD COLUMN IF NOT EXISTS performed_program_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];







