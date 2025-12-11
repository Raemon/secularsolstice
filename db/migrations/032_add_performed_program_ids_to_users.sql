ALTER TABLE users ADD COLUMN performed_program_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
