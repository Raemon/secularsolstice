alter table votes add column if not exists song_id uuid;

update votes v
set song_id = sv.song_id
from song_versions sv
where v.version_id = sv.id
  and v.song_id is null;

alter table votes alter column song_id set not null;

alter table votes drop constraint if exists votes_song_id_fkey;
alter table votes add constraint votes_song_id_fkey foreign key (song_id) references songs(id) on delete cascade;

create index if not exists votes_song_id_idx on votes using btree (song_id);

-- Clean up any duplicate votes before creating unique index (only if name column exists)
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'votes' and column_name = 'name') then
    delete from votes
    where id in (
      select id
      from (
        select id, row_number() over (partition by version_id, name order by created_at desc) as rn
        from votes
      ) t
      where rn > 1
    );
  end if;
end $$;

drop index if exists votes_version_id_name_idx;

-- Only create index if name column exists
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'votes' and column_name = 'name') then
    create unique index if not exists votes_version_id_name_idx on votes (version_id, name);
  end if;
end $$;


