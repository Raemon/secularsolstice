-- Change rendered_content from text to jsonb to store multiple render types
-- If the column is already jsonb (from a failed previous migration attempt),
-- we drop it and start fresh since the data is corrupted anyway.
-- The rendered_content is just cached data that can be regenerated.

-- Drop any existing columns from failed migration attempts
alter table song_versions drop column if exists rendered_content;
alter table song_versions drop column if exists rendered_content_new;

-- Create the column as jsonb
alter table song_versions add column rendered_content jsonb;

