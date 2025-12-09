alter table votes add column if not exists category text not null default 'quality';

-- Update the unique constraint to include category
drop index if exists votes_version_id_name_idx;
create unique index votes_version_id_name_category_idx on votes (version_id, name, category);

