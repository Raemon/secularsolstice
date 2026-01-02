-- Make title nullable in programs table since it's now stored in program_versions
-- The programs table now only needs: id, created_by, created_at
ALTER TABLE programs ALTER COLUMN title DROP NOT NULL;
