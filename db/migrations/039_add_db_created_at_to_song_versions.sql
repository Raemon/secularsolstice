-- Add db_created_at column to song_versions
-- This tracks when the version was actually added to the database,
-- separate from created_at which may be set to an imported file's original date
ALTER TABLE song_versions ADD COLUMN IF NOT EXISTS db_created_at timestamptz NOT NULL DEFAULT now();

-- Backfill existing rows with their created_at value
UPDATE song_versions SET db_created_at = created_at WHERE db_created_at = now();
