alter table programs
add column if not exists is_subprogram boolean not null default false;

update programs p
set is_subprogram = true
from (
  select unnest(program_ids) as subprogram_id
  from programs
) rel
where p.id = rel.subprogram_id;


