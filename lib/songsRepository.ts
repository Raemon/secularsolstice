import groupBy from 'lodash/groupBy';
import sql from './db';

export type RenderedContent = {
  htmlFull?: string;
  htmlChordsOnly?: string;
  htmlLyricsOnly?: string;
  htmlChordsFirstLyricLine?: string;
  plainText?: string;
  slides?: string;
  legacy?: string;
  [key: string]: string | undefined;
};

export type SongRecord = {
  id: string;
  title: string;
  createdBy: string | null;
  createdAt: string;
  archived: boolean;
  tags: string[];
};

export type SongVersionRecord = {
  id: string;
  songId: string;
  label: string;
  content: string | null;
  audioUrl: string | null;
  slidesMovieUrl: string | null;
  slideMovieStart: number | null;
  previousVersionId: string | null;
  nextVersionId: string | null;
  originalVersionId: string | null;
  renderedContent: RenderedContent | null;
  bpm: number | null;
  transpose: number | null;
  archived: boolean;
  createdBy: string | null;
  createdAt: string;
  dbCreatedAt: string;
  songTitle?: string;
  slideCredits: string | null;
  programCredits: string | null;
  blobUrl: string | null;
};

export type SongWithVersions = SongRecord & {
  versions: SongVersionRecord[];
};

type SongVersionQueryRow = {
  song_id: string;
  title: string;
  song_created_by: string | null;
  song_created_at: string;
  song_archived: boolean | null;
  song_tags: string[] | null;
  version_id: string | null;
  label: string | null;
  content: string | null;
  audio_url: string | null;
  previous_version_id: string | null;
  next_version_id: string | null;
  original_version_id: string | null;
  rendered_content: RenderedContent | null;
  bpm: number | null;
  transpose: number | null;
  archived: boolean | null;
  version_created_by: string | null;
  version_created_at: string | null;
  version_db_created_at: string | null;
  slides_movie_url: string | null;
  slide_movie_start: number | null;
  slide_credits: string | null;
  program_credits: string | null;
  blob_url: string | null;
};

type SongRowResult = {
  id: string;
  title: string;
  createdBy: string | null;
  createdAt: string;
  archived: boolean;
  tags: string[];
};

type SongVersionResult = {
  id: string;
  songId: string;
  label: string;
  content: string | null;
  audioUrl: string | null;
  slidesMovieUrl: string | null;
  slideMovieStart: number | null;
  previousVersionId: string | null;
  nextVersionId: string | null;
  originalVersionId: string | null;
  renderedContent: RenderedContent | null;
  bpm: number | null;
  transpose: number | null;
  archived: boolean;
  createdBy: string | null;
  createdAt: string;
  dbCreatedAt: string;
  songTitle?: string;
  slideCredits: string | null;
  programCredits: string | null;
  blobUrl: string | null;
};

const mapSongRow = (row: SongVersionQueryRow): SongRecord => ({
  id: row.song_id,
  title: row.title,
  createdBy: row.song_created_by,
  createdAt: row.song_created_at,
  archived: Boolean(row.song_archived),
  tags: row.song_tags || [],
});

const mapVersionRow = (row: SongVersionQueryRow): SongVersionRecord => ({
  id: row.version_id as string,
  songId: row.song_id,
  label: row.label as string,
  content: row.content,
  audioUrl: row.audio_url,
  previousVersionId: row.previous_version_id,
  nextVersionId: row.next_version_id,
  originalVersionId: row.original_version_id,
  renderedContent: row.rendered_content,
  bpm: row.bpm,
  transpose: row.transpose,
  archived: Boolean(row.archived),
  createdBy: row.version_created_by,
  createdAt: row.version_created_at as string,
  dbCreatedAt: row.version_db_created_at as string,
  slidesMovieUrl: row.slides_movie_url,
  slideMovieStart: row.slide_movie_start,
  slideCredits: row.slide_credits,
  programCredits: row.program_credits,
  blobUrl: row.blob_url,
});

const hasVersionData = (row: SongVersionQueryRow): row is SongVersionQueryRow & Required<Pick<SongVersionQueryRow, 'version_id' | 'label' | 'version_created_at'>> => Boolean(row.version_id);

// Reusable SQL fragments to avoid repetition across queries
// Version columns with camelCase aliases for SongVersionResult type
const versionSelectColumns = () => sql`
  v.id as "id",
  v.song_id as "songId",
  v.label,
  v.content,
  v.audio_url as "audioUrl",
  v.slides_movie_url as "slidesMovieUrl",
  v.slide_movie_start as "slideMovieStart",
  v.bpm,
  v.transpose,
  v.previous_version_id as "previousVersionId",
  v.next_version_id as "nextVersionId",
  v.original_version_id as "originalVersionId",
  v.rendered_content as "renderedContent",
  v.archived as "archived",
  v.created_by as "createdBy",
  v.created_at as "createdAt",
  v.db_created_at as "dbCreatedAt",
  v.slide_credits as "slideCredits",
  v.program_credits as "programCredits",
  v.blob_url as "blobUrl"
`;

// Version columns for song+version JOIN queries (snake_case for SongVersionQueryRow)
const songVersionJoinColumns = () => sql`
  s.id as song_id,
  s.title,
  s.created_by as song_created_by,
  s.created_at as song_created_at,
  s.archived as song_archived,
  s.tags as song_tags,
  v.id as version_id,
  v.label,
  v.content,
  v.audio_url,
  v.slides_movie_url,
  v.slide_movie_start,
  v.previous_version_id,
  v.next_version_id,
  v.original_version_id,
  v.rendered_content,
  v.bpm,
  v.transpose,
  v.archived,
  v.created_by as version_created_by,
  v.created_at as version_created_at,
  v.db_created_at as version_db_created_at,
  v.slide_credits,
  v.program_credits,
  v.blob_url
`;

// RETURNING clause for version mutations
const versionReturningClause = sql`id, song_id as "songId", label, content, audio_url as "audioUrl", slides_movie_url as "slidesMovieUrl", slide_movie_start as "slideMovieStart", bpm, transpose, previous_version_id as "previousVersionId", next_version_id as "nextVersionId", original_version_id as "originalVersionId", rendered_content as "renderedContent", archived, created_by as "createdBy", created_at as "createdAt", db_created_at as "dbCreatedAt", slide_credits as "slideCredits", program_credits as "programCredits", blob_url as "blobUrl"`;

// Helper to group song+version rows into SongWithVersions[]
const groupSongVersionRows = (rows: SongVersionQueryRow[]): SongWithVersions[] => {
  const grouped = groupBy(rows, (row: SongVersionQueryRow) => row.song_id);
  return Object.values(grouped).map((group: SongVersionQueryRow[]) => ({
    ...mapSongRow(group[0]!),
    versions: group.filter(hasVersionData).map(mapVersionRow),
  }));
};

// Reusable CTE for getting the latest version per (song_id, label) pair based on created_at
export const latestVersionPerLabelCte = () => sql`
  select distinct on (song_id, label) *
  from song_versions
  where archived = false
  order by song_id, label, created_at desc
`;

// Get the ID of the most recently created version for a song (from among latest-per-label versions)
export const getLatestVersionIdForSong = async (songId: string): Promise<string | null> => {
  const rows = await sql`
    with latest_per_label as (
      ${latestVersionPerLabelCte()}
    )
    select id from latest_per_label
    where song_id = ${songId}
    order by created_at desc
    limit 1
  `;
  return rows.length > 0 ? (rows[0] as { id: string }).id : null;
};

export const listSongsWithVersions = async (): Promise<SongWithVersions[]> => {
  const rows = await sql`
    with latest_per_label as (
      ${latestVersionPerLabelCte()}
    )
    select ${songVersionJoinColumns()}
    from songs s
    left join latest_per_label v on v.song_id = s.id
    where s.archived = false
    order by s.title asc, v.created_at desc nulls last
  `;
  return groupSongVersionRows(rows as SongVersionQueryRow[]);
};

export type PaginatedSongsResult = {
  songs: SongWithVersions[];
  total: number;
  hasMore: boolean;
};

export const listSongsWithVersionsPaginated = async (options: { limit?: number; offset?: number; excludeIds?: string[] } = {}): Promise<PaginatedSongsResult> => {
  const { limit, offset = 0, excludeIds = [] } = options;
  // Get total count first
  const countResult = await sql`
    select count(*)::int as total from songs where archived = false
  `;
  const total = (countResult as { total: number }[])[0].total;
  // Build the query - order by most recent version update, with README-only songs at bottom
  const rows = await sql`
    with latest_per_label as (
      ${latestVersionPerLabelCte()}
    ),
    ranked_songs as (
      select
        s.id as song_id,
        s.title,
        s.created_by as song_created_by,
        s.created_at as song_created_at,
        s.archived as song_archived,
        s.tags as song_tags,
        max(v.created_at) as latest_version_at,
        (count(v.id) = 1 and bool_and(v.label = 'README.md')) as only_readme
      from songs s
      left join latest_per_label v on v.song_id = s.id
      where s.archived = false ${excludeIds.length > 0 ? sql`and s.id != ALL(${excludeIds})` : sql``}
      group by s.id
      order by only_readme asc, latest_version_at desc nulls last
      ${limit !== undefined ? sql`limit ${limit} offset ${offset}` : sql``}
    )
    select
      rs.song_id,
      rs.title,
      rs.song_created_by,
      rs.song_created_at,
      rs.song_archived,
      rs.song_tags,
      v.id as version_id,
      v.label,
      v.content,
      v.audio_url,
      v.slides_movie_url,
      v.slide_movie_start,
      v.previous_version_id,
      v.next_version_id,
      v.original_version_id,
      v.rendered_content,
      v.bpm,
      v.transpose,
      v.archived,
      v.created_by as version_created_by,
      v.created_at as version_created_at,
      v.db_created_at as version_db_created_at,
      v.slide_credits,
      v.program_credits,
      v.blob_url
    from ranked_songs rs
    left join latest_per_label v on v.song_id = rs.song_id
    order by rs.only_readme asc, rs.latest_version_at desc nulls last, v.created_at desc nulls last
  `;
  const songs = groupSongVersionRows(rows as SongVersionQueryRow[]);
  const loadedCount = offset + songs.length + excludeIds.length;
  return { songs, total, hasMore: loadedCount < total };
};

export const listSongsWithAllVersions = async (): Promise<SongWithVersions[]> => {
  const rows = await sql`
    select ${songVersionJoinColumns()}
    from songs s
    left join song_versions v on v.song_id = s.id and v.archived = false
    where s.archived = false
    order by s.title asc, v.created_at desc nulls last
  `;
  return groupSongVersionRows(rows as SongVersionQueryRow[]);
};

export const getSongWithVersions = async (songId: string): Promise<SongWithVersions | null> => {
  const rows = await sql`
    with latest_per_label as (
      ${latestVersionPerLabelCte()}
    )
    select ${songVersionJoinColumns()}
    from songs s
    left join latest_per_label v on v.song_id = s.id
    where s.id = ${songId} and s.archived = false
    order by v.created_at desc nulls last
  `;
  const typedRows = rows as SongVersionQueryRow[];
  if (typedRows.length === 0) return null;
  return groupSongVersionRows(typedRows)[0];
};

export const createSong = async (title: string, createdBy?: string | null, tags: string[] = ['song']): Promise<SongRecord> => {
  const rows = await sql`
    insert into songs (title, created_by, tags)
    values (${title}, ${createdBy ?? null}, ${tags}::text[])
    returning id, title, created_by as "createdBy", created_at as "createdAt", archived, tags
  `;
  return (rows as SongRowResult[])[0];
};

export const createVersion = async (params: { songId: string; label: string; content: string | null; audioUrl?: string | null; slidesMovieUrl?: string | null; slideMovieStart?: number | null; bpm?: number | null; transpose?: number | null; previousVersionId?: string | null; nextVersionId?: string | null; originalVersionId?: string | null; createdBy?: string | null; slideCredits?: string | null; programCredits?: string | null; blobUrl?: string | null; createdAt?: string | Date | null; dbCreatedAt?: string | Date | null; }): Promise<SongVersionRecord> => {
  // If no createdAt provided, let DB default both columns to now()
  if (params.createdAt === undefined) {
    const rows = await sql`
      insert into song_versions (song_id, label, content, audio_url, slides_movie_url, slide_movie_start, bpm, transpose, previous_version_id, next_version_id, original_version_id, created_by, slide_credits, program_credits, blob_url)
      values (${params.songId}, ${params.label}, ${params.content}, ${params.audioUrl ?? null}, ${params.slidesMovieUrl ?? null}, ${params.slideMovieStart ?? null}, ${params.bpm ?? null}, ${params.transpose ?? null}, ${params.previousVersionId ?? null}, ${params.nextVersionId ?? null}, ${params.originalVersionId ?? null}, ${params.createdBy ?? null}, ${params.slideCredits ?? null}, ${params.programCredits ?? null}, ${params.blobUrl ?? null})
      returning ${versionReturningClause}
    `;
    return (rows as SongVersionResult[])[0];
  }
  // If dbCreatedAt not provided, use createdAt to keep them identical
  const dbCreatedAt = params.dbCreatedAt ?? params.createdAt;
  const rows = await sql`
    insert into song_versions (song_id, label, content, audio_url, slides_movie_url, slide_movie_start, bpm, transpose, previous_version_id, next_version_id, original_version_id, created_by, slide_credits, program_credits, blob_url, created_at, db_created_at)
    values (${params.songId}, ${params.label}, ${params.content}, ${params.audioUrl ?? null}, ${params.slidesMovieUrl ?? null}, ${params.slideMovieStart ?? null}, ${params.bpm ?? null}, ${params.transpose ?? null}, ${params.previousVersionId ?? null}, ${params.nextVersionId ?? null}, ${params.originalVersionId ?? null}, ${params.createdBy ?? null}, ${params.slideCredits ?? null}, ${params.programCredits ?? null}, ${params.blobUrl ?? null}, ${params.createdAt}, ${dbCreatedAt})
    returning ${versionReturningClause}
  `;
  return (rows as SongVersionResult[])[0];
};

export const findVersionBySongTitleAndLabel = async (songTitle: string, label: string): Promise<SongVersionRecord | null> => {
  const rows = await sql`
    with latest_per_label as (
      ${latestVersionPerLabelCte()}
    )
    select ${versionSelectColumns()}
    from latest_per_label v
    join songs s on s.id = v.song_id
    where LOWER(s.title) = LOWER(${songTitle}) and v.label = ${label} and s.archived = false
  `;
  const typedRows = rows as SongVersionResult[];
  return typedRows.length > 0 ? typedRows[0] : null;
};

export const updateVersionNextId = async (versionId: string, nextVersionId: string): Promise<SongVersionRecord> => {
  const rows = await sql`
    update song_versions set next_version_id = ${nextVersionId} where id = ${versionId}
    returning ${versionReturningClause}
  `;
  const typedRows = rows as SongVersionResult[];
  if (typedRows.length === 0) throw new Error(`Version ${versionId} not found`);
  return typedRows[0];
};

export const getVersionById = async (versionId: string): Promise<SongVersionRecord | null> => {
  const rows = await sql`
    select ${versionSelectColumns()}, s.title as "songTitle"
    from song_versions v
    join songs s on v.song_id = s.id
    where v.id = ${versionId} and v.archived = false
  `;
  const typedRows = rows as SongVersionResult[];
  return typedRows.length > 0 ? typedRows[0] : null;
};

export const getVersionsByIds = async (versionIds: string[]): Promise<SongVersionRecord[]> => {
  if (versionIds.length === 0) return [];
  const rows = await sql`
    select ${versionSelectColumns()}, s.title as "songTitle"
    from song_versions v
    join songs s on v.song_id = s.id
    where v.id = ANY(${versionIds}) and v.archived = false
  `;
  return rows as SongVersionRecord[];
};

export const getPreviousVersionsChain = async (versionId: string): Promise<SongVersionRecord[]> => {
  const currentVersion = await getVersionById(versionId);
  if (!currentVersion) return [];
  const originalVersionId = currentVersion.originalVersionId || currentVersion.id;
  const rows = await sql`
    select ${versionSelectColumns()}
    from song_versions v
    where v.original_version_id = ${originalVersionId}
      and v.label = ${currentVersion.label}
      and v.id != ${versionId}
      and v.created_at < ${currentVersion.createdAt}
      and v.archived = false
    order by v.created_at desc
  `;
  return rows as SongVersionRecord[];
};

export const createVersionWithLineage = async (params: { songId: string; label: string; content: string | null; audioUrl?: string | null; slidesMovieUrl?: string | null; slideMovieStart?: number | null; bpm?: number | null; transpose?: number | null; previousVersionId?: string | null; createdBy?: string | null; slideCredits?: string | null; programCredits?: string | null; blobUrl?: string | null; createdAt?: string | Date | null; dbCreatedAt?: string | Date | null; }): Promise<SongVersionRecord> => {
  let originalVersionId: string | null = null;
  
  if (params.previousVersionId) {
    const previousVersion = await getVersionById(params.previousVersionId);
    if (previousVersion) {
      originalVersionId = previousVersion.originalVersionId || previousVersion.id;
    }
  } else {
    originalVersionId = null;
  }
  
  const newVersion = await createVersion({
    songId: params.songId,
    label: params.label,
    content: params.content,
    audioUrl: params.audioUrl,
    slidesMovieUrl: params.slidesMovieUrl,
    slideMovieStart: params.slideMovieStart,
    bpm: params.bpm,
    transpose: params.transpose,
    previousVersionId: params.previousVersionId,
    originalVersionId: originalVersionId,
    createdBy: params.createdBy,
    slideCredits: params.slideCredits,
    programCredits: params.programCredits,
    blobUrl: params.blobUrl,
    createdAt: params.createdAt,
    dbCreatedAt: params.dbCreatedAt,
  });
  
  if (params.previousVersionId) {
    await updateVersionNextId(params.previousVersionId, newVersion.id);
  }
  
  if (!originalVersionId) {
    const rows = await sql`
      update song_versions set original_version_id = ${newVersion.id} where id = ${newVersion.id}
      returning ${versionReturningClause}
    `;
    return (rows as SongVersionResult[])[0];
  }
  return newVersion;
};

export const updateVersion = async (versionId: string, updates: { label?: string; content?: string | null; audioUrl?: string | null; slidesMovieUrl?: string | null; slideMovieStart?: number | null; bpm?: number | null; transpose?: number | null; previousVersionId?: string | null; nextVersionId?: string | null; slideCredits?: string | null; programCredits?: string | null; blobUrl?: string | null; }): Promise<SongVersionRecord> => {
  // Get current version first
  const current = await getVersionById(versionId);
  if (!current) {
    throw new Error(`Version ${versionId} not found`);
  }

  // Determine final values (use update values if provided, otherwise keep current)
  const finalLabel = updates.label !== undefined ? updates.label : current.label;
  const finalContent = updates.content !== undefined ? updates.content : current.content;
  const finalAudioUrl = updates.audioUrl !== undefined ? updates.audioUrl : current.audioUrl;
  const finalSlidesMovieUrl = updates.slidesMovieUrl !== undefined ? updates.slidesMovieUrl : current.slidesMovieUrl;
  const finalSlideMovieStart = updates.slideMovieStart !== undefined ? updates.slideMovieStart : current.slideMovieStart;
  const finalBpm = updates.bpm !== undefined ? updates.bpm : current.bpm;
  const finalTranspose = updates.transpose !== undefined ? updates.transpose : current.transpose;
  const finalPreviousVersionId = updates.previousVersionId !== undefined ? updates.previousVersionId : current.previousVersionId;
  const finalNextVersionId = updates.nextVersionId !== undefined ? updates.nextVersionId : current.nextVersionId;
  const finalSlideCredits = updates.slideCredits !== undefined ? updates.slideCredits : current.slideCredits;
  const finalProgramCredits = updates.programCredits !== undefined ? updates.programCredits : current.programCredits;
  const finalBlobUrl = updates.blobUrl !== undefined ? updates.blobUrl : current.blobUrl;

  const rows = await sql`
    update song_versions
    set 
      label = ${finalLabel},
      content = ${finalContent},
      audio_url = ${finalAudioUrl},
      slides_movie_url = ${finalSlidesMovieUrl},
      slide_movie_start = ${finalSlideMovieStart},
      bpm = ${finalBpm},
      transpose = ${finalTranspose},
      previous_version_id = ${finalPreviousVersionId},
      next_version_id = ${finalNextVersionId},
      slide_credits = ${finalSlideCredits},
      program_credits = ${finalProgramCredits},
      blob_url = ${finalBlobUrl}
    where id = ${versionId}
    returning ${versionReturningClause}
  `;
  const typedRows = rows as SongVersionResult[];
  if (typedRows.length === 0) throw new Error(`Version ${versionId} not found`);
  return typedRows[0];
};

export const updateVersionRenderedContent = async (versionId: string, renderedContent: RenderedContent): Promise<SongVersionRecord> => {
  const rows = await sql`
    update song_versions set rendered_content = ${JSON.stringify(renderedContent)}::jsonb where id = ${versionId}
    returning ${versionReturningClause}
  `;
  const typedRows = rows as SongVersionResult[];
  if (typedRows.length === 0) throw new Error(`Version ${versionId} not found`);
  return typedRows[0];
};

export const archiveVersion = async (versionId: string): Promise<SongVersionRecord> => {
  const rows = await sql`
    update song_versions set archived = true where id = ${versionId} and archived = false
    returning ${versionReturningClause}
  `;
  const typedRows = rows as SongVersionResult[];
  if (typedRows.length === 0) throw new Error(`Version ${versionId} not found or already archived`);

  const version = typedRows[0];

  if (version.previousVersionId) {
    await sql`
      update song_versions
      set next_version_id = ${version.nextVersionId}
      where id = ${version.previousVersionId}
    `;
  }

  if (version.nextVersionId) {
    await sql`
      update song_versions
      set previous_version_id = ${version.previousVersionId}
      where id = ${version.nextVersionId}
    `;
  }

  return version;
};

export const listAllVersionsWithSongTitles = async () => {
  const rows = await sql`
    select
      v.id,
      v.song_id as "songId",
      v.label,
      s.title as "songTitle",
      v.created_at as "createdAt",
      v.next_version_id as "nextVersionId",
      v.program_credits as "programCredits",
      v.slide_movie_start as "slideMovieStart",
      s.tags
    from song_versions v
    join songs s on s.id = v.song_id
    where v.archived = false
      and s.archived = false
    order by s.title asc, v.label asc
  `;
  return rows as { id: string; songId: string; label: string; songTitle: string; createdAt: string; nextVersionId: string | null; programCredits: string | null; slideMovieStart: number | null; tags: string[]; }[];
};

export const getLatestVersionBySongTitle = async (songTitle: string): Promise<SongVersionRecord | null> => {
  const rows = await sql`
    with latest_per_label as (
      ${latestVersionPerLabelCte()}
    )
    select ${versionSelectColumns()}, s.title as "songTitle"
    from latest_per_label v
    join songs s on v.song_id = s.id
    where LOWER(s.title) = LOWER(${songTitle}) and s.archived = false
    order by v.created_at desc
    limit 1
  `;
  const typedRows = rows as SongVersionResult[];
  return typedRows.length > 0 ? typedRows[0] : null;
};

export const updateSongTags = async (songId: string, tags: string[]): Promise<SongRecord> => {
  const rows = await sql`
    update songs
    set tags = ${tags}::text[]
    where id = ${songId}
    returning id, title, created_by as "createdBy", created_at as "createdAt", archived, tags
  `;
  const typedRows = rows as SongRowResult[];
  if (typedRows.length === 0) {
    throw new Error(`Song ${songId} not found`);
  }
  return typedRows[0];
};

export const addSongTags = async (songId: string, newTags: string[]): Promise<SongRecord> => {
  if (newTags.length === 0) return getSongById(songId) as Promise<SongRecord>;
  const rows = await sql`
    update songs
    set tags = (select array_agg(distinct elem) from unnest(coalesce(tags, array[]::text[]) || ${newTags}::text[]) as elem)
    where id = ${songId}
    returning id, title, created_by as "createdBy", created_at as "createdAt", archived, tags
  `;
  const typedRows = rows as SongRowResult[];
  if (typedRows.length === 0) {
    throw new Error(`Song ${songId} not found`);
  }
  return typedRows[0];
};

export const getSongById = async (songId: string): Promise<SongRecord | null> => {
  const rows = await sql`
    select id, title, created_by as "createdBy", created_at as "createdAt", archived, tags
    from songs where id = ${songId}
  `;
  const typedRows = rows as SongRowResult[];
  return typedRows.length > 0 ? typedRows[0] : null;
};

export const updateSongTitle = async (songId: string, title: string): Promise<SongRecord> => {
  const rows = await sql`
    update songs
    set title = ${title}
    where id = ${songId}
    returning id, title, created_by as "createdBy", created_at as "createdAt", archived, tags
  `;
  const typedRows = rows as SongRowResult[];
  if (typedRows.length === 0) {
    throw new Error(`Song ${songId} not found`);
  }
  return typedRows[0];
};

export const archiveSong = async (songId: string, archived: boolean): Promise<SongRecord> => {
  const rows = await sql`
    update songs
    set archived = ${archived}
    where id = ${songId}
    returning id, title, created_by as "createdBy", created_at as "createdAt", archived, tags
  `;
  const typedRows = rows as SongRowResult[];
  if (typedRows.length === 0) {
    throw new Error(`Song ${songId} not found`);
  }
  return typedRows[0];
};

export type ChangelogVersionRecord = {
  id: string;
  songId: string;
  songTitle: string;
  label: string;
  content: string | null;
  previousContent: string | null;
  previousVersionId: string | null;
  createdBy: string | null;
  createdAt: string;
};

type ChangelogOptions = {
  songId?: string;
  filename?: string;
  username?: string;
  limit?: number;
  offset?: number;
};

export const listVersionsForChangelog = async ({ songId, filename, username, limit, offset }: ChangelogOptions = {}): Promise<ChangelogVersionRecord[]> => {
  const rows = songId
    ? await sql`
        select
          v.id,
          v.song_id as "songId",
          s.title as "songTitle",
          v.label,
          v.content,
          prev.content as "previousContent",
          v.previous_version_id as "previousVersionId",
          v.created_by as "createdBy",
          v.created_at as "createdAt"
        from song_versions v
        join songs s on s.id = v.song_id
        left join song_versions prev on prev.id = v.previous_version_id
        where v.archived = false and s.archived = false and v.song_id = ${songId}
          ${filename ? sql`and v.label = ${filename}` : sql``}
          ${username ? sql`and v.created_by = ${username}` : sql``}
        order by v.created_at desc
        ${limit ? sql`limit ${limit}` : sql``}
        ${offset ? sql`offset ${offset}` : sql``}
      `
    : await sql`
        select
          v.id,
          v.song_id as "songId",
          s.title as "songTitle",
          v.label,
          v.content,
          prev.content as "previousContent",
          v.previous_version_id as "previousVersionId",
          v.created_by as "createdBy",
          v.created_at as "createdAt"
        from song_versions v
        join songs s on s.id = v.song_id
        left join song_versions prev on prev.id = v.previous_version_id
        where v.archived = false and s.archived = false
          ${filename ? sql`and v.label = ${filename}` : sql``}
          ${username ? sql`and v.created_by = ${username}` : sql``}
        order by v.created_at desc
        ${limit ? sql`limit ${limit}` : sql``}
        ${offset ? sql`offset ${offset}` : sql``}
      `;
  return rows as ChangelogVersionRecord[];
};
