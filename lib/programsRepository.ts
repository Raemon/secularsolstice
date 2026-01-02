import sql from './db';

// Reusable CTE for getting the latest version per program based on created_at
export const latestProgramVersionCte = () => sql`
  select distinct on (program_id) *
  from program_versions
  order by program_id, created_at desc
`;

type ProgramRow = {
  id: string;
  title: string;
  element_ids: string[] | null;
  program_ids: string[] | null;
  created_by: string | null;
  created_at: string;
  archived: boolean;
  is_subprogram: boolean;
  video_url: string | null;
  print_program_foreword: string | null;
  print_program_epitaph: string | null;
  locked: boolean;
};

export type ProgramRecord = {
  id: string;
  title: string;
  elementIds: string[];
  programIds: string[];
  createdBy: string | null;
  createdAt: string;
  archived: boolean;
  isSubprogram: boolean;
  videoUrl: string | null;
  printProgramForeword: string | null;
  printProgramEpitaph: string | null;
  locked: boolean;
};

const mapProgramRow = (row: ProgramRow): ProgramRecord => ({
  id: row.id,
  title: row.title,
  elementIds: row.element_ids ?? [],
  programIds: row.program_ids ?? [],
  createdBy: row.created_by,
  createdAt: row.created_at,
  archived: row.archived,
  isSubprogram: row.is_subprogram,
  videoUrl: row.video_url,
  printProgramForeword: row.print_program_foreword,
  printProgramEpitaph: row.print_program_epitaph,
  locked: row.locked,
});

export const listPrograms = async (): Promise<ProgramRecord[]> => {
  const rows = await sql`
    with latest_versions as (${latestProgramVersionCte()})
    select p.id, lv.title, lv.element_ids, lv.program_ids, lv.created_by, p.created_at, lv.archived, lv.is_subprogram, lv.video_url, lv.print_program_foreword, lv.print_program_epitaph, lv.locked
    from programs p
    join latest_versions lv on lv.program_id = p.id
    where lv.archived = false
    order by p.created_at desc
  `;
  return (rows as ProgramRow[]).map(mapProgramRow);
};

export const createProgram = async (title: string, createdBy?: string | null, isSubprogram?: boolean, locked?: boolean, createdAt?: string, dbCreatedAt?: Date): Promise<ProgramRecord> => {
  // Insert into programs table (minimal data)
  const programRows = createdAt
    ? dbCreatedAt
      ? await sql`
          insert into programs (created_by, created_at, db_created_at)
          values (${createdBy ?? null}, ${createdAt}, ${dbCreatedAt})
          returning id, created_at
        `
      : await sql`
          insert into programs (created_by, created_at)
          values (${createdBy ?? null}, ${createdAt})
          returning id, created_at
        `
    : await sql`
        insert into programs (created_by)
        values (${createdBy ?? null})
        returning id, created_at
      `;
  const programId = (programRows as { id: string; created_at: string }[])[0].id;
  const programCreatedAt = (programRows as { id: string; created_at: string }[])[0].created_at;
  // Insert initial program_version
  const versionCreatedAt = createdAt ?? programCreatedAt;
  if (dbCreatedAt) {
    await sql`
      insert into program_versions (program_id, title, element_ids, program_ids, archived, is_subprogram, locked, created_at, created_by, db_created_at)
      values (${programId}, ${title}, ${[] as string[]}, ${[] as string[]}, false, ${isSubprogram ?? false}, ${locked ?? false}, ${versionCreatedAt}, ${createdBy ?? null}, ${dbCreatedAt})
    `;
  } else {
    await sql`
      insert into program_versions (program_id, title, element_ids, program_ids, archived, is_subprogram, locked, created_at, created_by)
      values (${programId}, ${title}, ${[] as string[]}, ${[] as string[]}, false, ${isSubprogram ?? false}, ${locked ?? false}, ${versionCreatedAt}, ${createdBy ?? null})
    `;
  }
  // Return the program with its version data
  return {
    id: programId,
    title,
    elementIds: [],
    programIds: [],
    createdBy: createdBy ?? null,
    createdAt: versionCreatedAt,
    archived: false,
    isSubprogram: isSubprogram ?? false,
    videoUrl: null,
    printProgramForeword: null,
    printProgramEpitaph: null,
    locked: locked ?? false,
  };
};

export const getProgramById = async (programId: string): Promise<ProgramRecord | null> => {
  const rows = await sql`
    with latest_versions as (${latestProgramVersionCte()})
    select p.id, lv.title, lv.element_ids, lv.program_ids, lv.created_by, p.created_at, lv.archived, lv.is_subprogram, lv.video_url, lv.print_program_foreword, lv.print_program_epitaph, lv.locked
    from programs p
    join latest_versions lv on lv.program_id = p.id
    where p.id = ${programId} and lv.archived = false
  `;
  const typedRows = rows as ProgramRow[];
  if (typedRows.length === 0) {
    return null;
  }
  return mapProgramRow(typedRows[0]);
};

export const getProgramByTitle = async (title: string): Promise<ProgramRecord | null> => {
  const rows = await sql`
    with latest_versions as (${latestProgramVersionCte()})
    select p.id, lv.title, lv.element_ids, lv.program_ids, lv.created_by, p.created_at, lv.archived, lv.is_subprogram, lv.video_url, lv.print_program_foreword, lv.print_program_epitaph, lv.locked
    from programs p
    join latest_versions lv on lv.program_id = p.id
    where LOWER(lv.title) = LOWER(${title}) and lv.archived = false
    limit 1
  `;
  const typedRows = rows as ProgramRow[];
  if (typedRows.length === 0) {
    return null;
  }
  return mapProgramRow(typedRows[0]);
};

export const updateProgramElementIds = async (programId: string, elementIds: string[], programIds: string[], createdBy?: string | null): Promise<ProgramRecord> => {
  // Single INSERT...SELECT to copy latest version with updated element_ids and program_ids
  const rows = await sql`
    with latest_versions as (${latestProgramVersionCte()})
    insert into program_versions (program_id, title, element_ids, program_ids, archived, is_subprogram, video_url, print_program_foreword, print_program_epitaph, locked, created_by)
    select lv.program_id, lv.title, ${elementIds}::uuid[], ${programIds}::uuid[], lv.archived, lv.is_subprogram, lv.video_url, lv.print_program_foreword, lv.print_program_epitaph, lv.locked, ${createdBy ?? null}::text
    from programs p
    join latest_versions lv on lv.program_id = p.id
    where p.id = ${programId} and lv.archived = false
    returning program_id as id, title, ${elementIds}::uuid[] as element_ids, ${programIds}::uuid[] as program_ids, created_by, created_at, archived, is_subprogram, video_url, print_program_foreword, print_program_epitaph, locked
  `;
  if ((rows as ProgramRow[]).length === 0) {
    throw new Error(`Program ${programId} not found or archived`);
  }
  return mapProgramRow((rows as ProgramRow[])[0]);
};

export const archiveProgram = async (programId: string, createdBy?: string | null): Promise<ProgramRecord> => {
  // Single INSERT...SELECT to copy latest version with archived = true
  const rows = await sql`
    with latest_versions as (${latestProgramVersionCte()})
    insert into program_versions (program_id, title, element_ids, program_ids, archived, is_subprogram, video_url, print_program_foreword, print_program_epitaph, locked, created_by)
    select lv.program_id, lv.title, lv.element_ids, lv.program_ids, true, lv.is_subprogram, lv.video_url, lv.print_program_foreword, lv.print_program_epitaph, lv.locked, ${createdBy ?? null}::text
    from programs p
    join latest_versions lv on lv.program_id = p.id
    where p.id = ${programId} and lv.archived = false
    returning program_id as id, title, element_ids, program_ids, created_by, created_at, true as archived, is_subprogram, video_url, print_program_foreword, print_program_epitaph, locked
  `;
  if ((rows as ProgramRow[]).length === 0) {
    throw new Error(`Program ${programId} not found or already archived`);
  }
  return mapProgramRow((rows as ProgramRow[])[0]);
};

export const updateProgramVideoUrl = async (programId: string, videoUrl: string, createdBy?: string | null): Promise<ProgramRecord> => {
  // Single INSERT...SELECT to copy latest version with updated video_url
  const rows = await sql`
    with latest_versions as (${latestProgramVersionCte()})
    insert into program_versions (program_id, title, element_ids, program_ids, archived, is_subprogram, video_url, print_program_foreword, print_program_epitaph, locked, created_by)
    select lv.program_id, lv.title, lv.element_ids, lv.program_ids, lv.archived, lv.is_subprogram, ${videoUrl}, lv.print_program_foreword, lv.print_program_epitaph, lv.locked, ${createdBy ?? null}::text
    from programs p
    join latest_versions lv on lv.program_id = p.id
    where p.id = ${programId} and lv.archived = false
    returning program_id as id, title, element_ids, program_ids, created_by, created_at, archived, is_subprogram, ${videoUrl} as video_url, print_program_foreword, print_program_epitaph, locked
  `;
  if ((rows as ProgramRow[]).length === 0) {
    throw new Error(`Program ${programId} not found or archived`);
  }
  return mapProgramRow((rows as ProgramRow[])[0]);
};

export const getProgramsContainingVersion = async (versionId: string): Promise<ProgramRecord[]> => {
  const rows = await sql`
    with latest_versions as (${latestProgramVersionCte()}),
    programs_with_versions as (
      select p.id, lv.title, lv.element_ids, lv.program_ids, lv.created_by, p.created_at, lv.archived, lv.is_subprogram, lv.video_url, lv.print_program_foreword, lv.print_program_epitaph, lv.locked
      from programs p
      join latest_versions lv on lv.program_id = p.id
      where lv.archived = false
    ),
    direct_programs as (
      select * from programs_with_versions
      where ${versionId} = ANY(element_ids)
    ),
    non_subprogram_direct as (
      select * from direct_programs where is_subprogram = false
    ),
    parent_programs as (
      select pv.*
      from programs_with_versions pv
      where exists (select 1 from direct_programs dp where dp.is_subprogram = true and dp.id = ANY(pv.program_ids))
    )
    select * from non_subprogram_direct
    union
    select * from parent_programs
    order by created_at desc
  `;
  return (rows as ProgramRow[]).map(mapProgramRow);
};

export const updateProgram = async (programId: string, updates: {title?: string; printProgramForeword?: string | null; printProgramEpitaph?: string | null; videoUrl?: string | null; isSubprogram?: boolean; locked?: boolean; createdBy?: string | null}, versionCreatedBy?: string | null): Promise<ProgramRecord> => {
  // Use undefined-aware update logic: undefined means "keep existing", null means "set to null"
  const hasTitle = updates.title !== undefined;
  const hasForeword = updates.printProgramForeword !== undefined;
  const hasEpitaph = updates.printProgramEpitaph !== undefined;
  const hasVideoUrl = updates.videoUrl !== undefined;
  const hasIsSubprogram = updates.isSubprogram !== undefined;
  const hasLocked = updates.locked !== undefined;
  const hasCreatedBy = updates.createdBy !== undefined;
  // Single INSERT...SELECT with conditional updates
  const rows = await sql`
    with latest_versions as (${latestProgramVersionCte()})
    insert into program_versions (program_id, title, element_ids, program_ids, archived, is_subprogram, video_url, print_program_foreword, print_program_epitaph, locked, created_by)
    select lv.program_id,
      case when ${hasTitle} then ${updates.title ?? ''} else lv.title end,
      lv.element_ids, lv.program_ids, lv.archived,
      case when ${hasIsSubprogram} then ${updates.isSubprogram ?? false} else lv.is_subprogram end,
      case when ${hasVideoUrl} then ${updates.videoUrl ?? null} else lv.video_url end,
      case when ${hasForeword} then ${updates.printProgramForeword ?? null} else lv.print_program_foreword end,
      case when ${hasEpitaph} then ${updates.printProgramEpitaph ?? null} else lv.print_program_epitaph end,
      case when ${hasLocked} then ${updates.locked ?? false} else lv.locked end,
      coalesce(${versionCreatedBy ?? null}::text, case when ${hasCreatedBy} then ${updates.createdBy ?? null} else lv.created_by end)
    from programs p
    join latest_versions lv on lv.program_id = p.id
    where p.id = ${programId} and lv.archived = false
    returning program_id as id, title, element_ids, program_ids, created_by, created_at, archived, is_subprogram, video_url, print_program_foreword, print_program_epitaph, locked
  `;
  if ((rows as ProgramRow[]).length === 0) {
    throw new Error(`Program ${programId} not found or archived`);
  }
  return mapProgramRow((rows as ProgramRow[])[0]);
};

export type ProgramChangelogVersionRecord = {
  id: string;
  programId: string;
  programTitle: string;
  title: string | null;
  previousTitle: string | null;
  elementCount: number;
  previousElementCount: number | null;
  programCount: number;
  previousProgramCount: number | null;
  videoUrl: string | null;
  previousVideoUrl: string | null;
  printProgramForeword: string | null;
  previousPrintProgramForeword: string | null;
  printProgramEpitaph: string | null;
  previousPrintProgramEpitaph: string | null;
  isSubprogram: boolean;
  previousIsSubprogram: boolean | null;
  locked: boolean;
  previousLocked: boolean | null;
  archived: boolean;
  previousArchived: boolean | null;
  elementsReordered: boolean;
  programsReordered: boolean;
  createdBy: string | null;
  createdAt: string;
};

type ProgramChangelogOptions = {
  programId?: string;
  username?: string;
  limit?: number;
  offset?: number;
};

export const listProgramVersionsForChangelog = async ({ programId, username, limit, offset }: ProgramChangelogOptions = {}): Promise<ProgramChangelogVersionRecord[]> => {
  const rows = await sql`
    with versions_with_prev as (
      select
        v.id,
        v.program_id,
        v.title,
        v.element_ids,
        v.program_ids,
        coalesce(array_length(v.element_ids, 1), 0) as element_count,
        coalesce(array_length(v.program_ids, 1), 0) as program_count,
        v.video_url,
        v.print_program_foreword,
        v.print_program_epitaph,
        v.is_subprogram,
        v.locked,
        v.archived,
        v.created_by,
        v.created_at,
        lag(v.title) over (partition by v.program_id order by v.created_at) as prev_title,
        lag(v.element_ids) over (partition by v.program_id order by v.created_at) as prev_element_ids,
        lag(v.program_ids) over (partition by v.program_id order by v.created_at) as prev_program_ids,
        lag(coalesce(array_length(v.element_ids, 1), 0)) over (partition by v.program_id order by v.created_at) as prev_element_count,
        lag(coalesce(array_length(v.program_ids, 1), 0)) over (partition by v.program_id order by v.created_at) as prev_program_count,
        lag(v.video_url) over (partition by v.program_id order by v.created_at) as prev_video_url,
        lag(v.print_program_foreword) over (partition by v.program_id order by v.created_at) as prev_print_program_foreword,
        lag(v.print_program_epitaph) over (partition by v.program_id order by v.created_at) as prev_print_program_epitaph,
        lag(v.is_subprogram) over (partition by v.program_id order by v.created_at) as prev_is_subprogram,
        lag(v.locked) over (partition by v.program_id order by v.created_at) as prev_locked,
        lag(v.archived) over (partition by v.program_id order by v.created_at) as prev_archived,
        row_number() over (partition by v.program_id order by v.created_at) as rn
      from program_versions v
    )
    select
      vp.id,
      vp.program_id as "programId",
      vp.title as "programTitle",
      vp.title,
      vp.prev_title as "previousTitle",
      vp.element_count as "elementCount",
      vp.prev_element_count as "previousElementCount",
      vp.program_count as "programCount",
      vp.prev_program_count as "previousProgramCount",
      vp.video_url as "videoUrl",
      vp.prev_video_url as "previousVideoUrl",
      vp.print_program_foreword as "printProgramForeword",
      vp.prev_print_program_foreword as "previousPrintProgramForeword",
      vp.print_program_epitaph as "printProgramEpitaph",
      vp.prev_print_program_epitaph as "previousPrintProgramEpitaph",
      vp.is_subprogram as "isSubprogram",
      vp.prev_is_subprogram as "previousIsSubprogram",
      vp.locked,
      vp.prev_locked as "previousLocked",
      vp.archived,
      vp.prev_archived as "previousArchived",
      (vp.element_ids != vp.prev_element_ids and vp.element_count = vp.prev_element_count and (select array_agg(x order by x) from unnest(vp.element_ids) x) = (select array_agg(x order by x) from unnest(vp.prev_element_ids) x)) as "elementsReordered",
      (vp.program_ids != vp.prev_program_ids and vp.program_count = vp.prev_program_count and (select array_agg(x order by x) from unnest(vp.program_ids) x) = (select array_agg(x order by x) from unnest(vp.prev_program_ids) x)) as "programsReordered",
      vp.created_by as "createdBy",
      vp.created_at as "createdAt"
    from versions_with_prev vp
    where 1=1
      ${programId ? sql`and vp.program_id = ${programId}` : sql``}
      ${username ? sql`and vp.created_by = ${username}` : sql``}
    order by vp.created_at desc
    ${limit ? sql`limit ${limit}` : sql``}
    ${offset ? sql`offset ${offset}` : sql``}
  `;
  return rows as ProgramChangelogVersionRecord[];
};