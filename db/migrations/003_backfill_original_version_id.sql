-- Backfill original_version_id for all song_versions
-- For versions without a previous_version_id, set original_version_id to their own id
-- For versions with a previous_version_id, find the original version by following the chain backwards
-- For versions with broken chains (previous_version_id points to non-existent version), treat as originals

-- First, set original_version_id for versions that are originals (no previous_version_id)
update song_versions
set original_version_id = id
where previous_version_id is null
  and (original_version_id is null or original_version_id != id);

-- Also set original_version_id for versions with broken chains (previous_version_id doesn't exist)
update song_versions sv
set original_version_id = sv.id
where sv.previous_version_id is not null
  and not exists (
    select 1 from song_versions sv2 where sv2.id = sv.previous_version_id
  )
  and (sv.original_version_id is null or sv.original_version_id != sv.id);

-- Then, use a recursive CTE to find and set original_version_id for all versions in chains
-- This finds the root version (one with no previous_version_id) for each version
with recursive version_chain as (
  -- Base case: versions that are originals
  select id, id as root_id, previous_version_id
  from song_versions
  where previous_version_id is null
  
  union all
  
  -- Recursive case: follow the chain backwards
  select sv.id, vc.root_id, sv.previous_version_id
  from song_versions sv
  join version_chain vc on sv.previous_version_id = vc.id
)
update song_versions sv
set original_version_id = vc.root_id
from version_chain vc
where sv.id = vc.id
  and (sv.original_version_id is null or sv.original_version_id != vc.root_id);

