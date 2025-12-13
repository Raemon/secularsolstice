-- First, delete duplicate votes keeping only the most recent one per (version_id, name, category) group (only if name column exists)
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'votes' and column_name = 'name') then
    DELETE FROM votes
    WHERE id IN (
      SELECT id
      FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY version_id, name, category ORDER BY created_at DESC) as rn
        FROM votes
      ) t
      WHERE rn > 1
    );
  end if;
end $$;

-- Remove the unique index that uses name
DROP INDEX IF EXISTS votes_version_id_name_category_idx;

-- Remove the name column from votes
ALTER TABLE votes DROP COLUMN IF EXISTS name;