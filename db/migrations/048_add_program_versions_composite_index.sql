-- Add composite index for efficient DISTINCT ON (program_id) ORDER BY program_id, created_at DESC queries
CREATE INDEX if not exists program_versions_program_id_created_at_idx ON program_versions (program_id, created_at DESC);
