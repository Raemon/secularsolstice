-- Add created_by column to songs, song_versions, and programs tables
alter table songs add column if not exists created_by text;
alter table song_versions add column if not exists created_by text;
alter table programs add column if not exists created_by text;

