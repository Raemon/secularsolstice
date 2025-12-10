alter table votes add column if not exists category text not null default 'quality';

-- Clean up any duplicate votes before creating unique index (only if name column exists)
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'votes' and column_name = 'name') then
    delete from votes
    where id in (
      select id
      from (
        select id, row_number() over (partition by version_id, name, category order by created_at desc) as rn
        from votes
      ) t
      where rn > 1
    );
  end if;
end $$;

-- Update the unique constraint to include category
drop index if exists votes_version_id_name_idx;
drop index if exists votes_version_id_name_category_idx;

-- Only create index if name column exists
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'votes' and column_name = 'name') then
    create unique index if not exists votes_version_id_name_category_idx on votes (version_id, name, category);
  end if;
end $$;

