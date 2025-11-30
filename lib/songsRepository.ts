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
};

export type SongVersionRecord = {
  id: string;
  songId: string;
  label: string;
  content: string | null;
  audioUrl: string | null;
  previousVersionId: string | null;
  nextVersionId: string | null;
  originalVersionId: string | null;
  renderedContent: RenderedContent | null;
  bpm: number | null;
  archived: boolean;
  createdBy: string | null;
  createdAt: string;
  songTitle?: string;
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
  version_id: string | null;
  label: string | null;
  content: string | null;
  audio_url: string | null;
  previous_version_id: string | null;
  next_version_id: string | null;
  original_version_id: string | null;
  rendered_content: RenderedContent | null;
  bpm: number | null;
  archived: boolean | null;
  version_created_by: string | null;
  version_created_at: string | null;
};

type SongRowResult = {
  id: string;
  title: string;
  createdBy: string | null;
  createdAt: string;
  archived: boolean;
};

type SongVersionResult = {
  id: string;
  songId: string;
  label: string;
  content: string | null;
  audioUrl: string | null;
  previousVersionId: string | null;
  nextVersionId: string | null;
  originalVersionId: string | null;
  renderedContent: RenderedContent | null;
  bpm: number | null;
  archived: boolean;
  createdBy: string | null;
  createdAt: string;
  songTitle?: string;
};

const mapSongRow = (row: SongVersionQueryRow): SongRecord => ({
  id: row.song_id,
  title: row.title,
  createdBy: row.song_created_by,
  createdAt: row.song_created_at,
  archived: Boolean(row.song_archived),
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
  archived: Boolean(row.archived),
  createdBy: row.version_created_by,
  createdAt: row.version_created_at as string,
});

const hasVersionData = (row: SongVersionQueryRow): row is SongVersionQueryRow & Required<Pick<SongVersionQueryRow, 'version_id' | 'label' | 'version_created_at'>> => Boolean(row.version_id);

export const listSongsWithVersions = async (): Promise<SongWithVersions[]> => {
  const rows = await sql`
    select
      s.id as song_id,
      s.title,
      s.created_by as song_created_by,
      s.created_at as song_created_at,
      s.archived as song_archived,
      v.id as version_id,
      v.label,
      v.content,
      v.audio_url,
      v.previous_version_id,
      v.next_version_id,
      v.original_version_id,
      v.rendered_content,
      v.bpm,
      v.archived,
      v.created_by as version_created_by,
      v.created_at as version_created_at
    from songs s
    left join song_versions v on v.song_id = s.id and v.next_version_id is null and v.archived = false
    where s.archived = false
    order by s.title asc, v.created_at desc nulls last
  `;

  const typedRows = rows as SongVersionQueryRow[];
  const grouped = groupBy(typedRows, (row) => row.song_id);
  return Object.values(grouped).map((group) => ({
    ...mapSongRow(group[0]!),
    versions: group
      .filter(hasVersionData)
      .map(mapVersionRow),
  }));
};

export const getSongWithVersions = async (songId: string): Promise<SongWithVersions | null> => {
  const rows = await sql`
    select
      s.id as song_id,
      s.title,
      s.created_by as song_created_by,
      s.created_at as song_created_at,
      s.archived as song_archived,
      v.id as version_id,
      v.label,
      v.content,
      v.audio_url,
      v.previous_version_id,
      v.next_version_id,
      v.original_version_id,
      v.rendered_content,
      v.bpm,
      v.archived,
      v.created_by as version_created_by,
      v.created_at as version_created_at
    from songs s
    left join song_versions v on v.song_id = s.id and v.next_version_id is null and v.archived = false
    where s.id = ${songId} and s.archived = false
    order by v.created_at desc nulls last
  `;

  const typedRows = rows as SongVersionQueryRow[];

  if (typedRows.length === 0) {
    return null;
  }

  return {
    ...mapSongRow(typedRows[0]!),
    versions: typedRows
      .filter(hasVersionData)
      .map(mapVersionRow),
  };
};

export const createSong = async (title: string, createdBy?: string | null): Promise<SongRecord> => {
  const rows = await sql`
    insert into songs (title, created_by)
    values (${title}, ${createdBy ?? null})
    returning id, title, created_by as "createdBy", created_at as "createdAt", archived
  `;
  return (rows as SongRowResult[])[0];
};

export const createVersion = async (params: { songId: string; label: string; content: string | null; audioUrl?: string | null; bpm?: number | null; previousVersionId?: string | null; nextVersionId?: string | null; originalVersionId?: string | null; createdBy?: string | null; }): Promise<SongVersionRecord> => {
  const rows = await sql`
    insert into song_versions (song_id, label, content, audio_url, bpm, previous_version_id, next_version_id, original_version_id, created_by)
    values (${params.songId}, ${params.label}, ${params.content}, ${params.audioUrl ?? null}, ${params.bpm ?? null}, ${params.previousVersionId ?? null}, ${params.nextVersionId ?? null}, ${params.originalVersionId ?? null}, ${params.createdBy ?? null})
    returning id, song_id as "songId", label, content, audio_url as "audioUrl", bpm, previous_version_id as "previousVersionId", next_version_id as "nextVersionId", original_version_id as "originalVersionId", rendered_content as "renderedContent", archived, created_by as "createdBy", created_at as "createdAt"
  `;
  return (rows as SongVersionResult[])[0];
};

export const findVersionBySongTitleAndLabel = async (songTitle: string, label: string): Promise<SongVersionRecord | null> => {
  const rows = await sql`
    select
      v.id as "id",
      v.song_id as "songId",
      v.label,
      v.content,
      v.audio_url as "audioUrl",
      v.bpm,
      v.previous_version_id as "previousVersionId",
      v.next_version_id as "nextVersionId",
      v.original_version_id as "originalVersionId",
      v.rendered_content as "renderedContent",
      v.archived as "archived",
      v.created_by as "createdBy",
      v.created_at as "createdAt"
    from song_versions v
    join songs s on s.id = v.song_id
    where s.title = ${songTitle} and v.label = ${label} and v.archived = false and s.archived = false
    order by v.created_at desc
    limit 1
  `;
  const typedRows = rows as SongVersionResult[];
  return typedRows.length > 0 ? typedRows[0] : null;
};

export const updateVersionNextId = async (versionId: string, nextVersionId: string): Promise<SongVersionRecord> => {
  const rows = await sql`
    update song_versions
    set next_version_id = ${nextVersionId}
    where id = ${versionId}
    returning id, song_id as "songId", label, content, audio_url as "audioUrl", bpm, previous_version_id as "previousVersionId", next_version_id as "nextVersionId", original_version_id as "originalVersionId", rendered_content as "renderedContent", archived, created_by as "createdBy", created_at as "createdAt"
  `;
  const typedRows = rows as SongVersionResult[];
  if (typedRows.length === 0) {
    throw new Error(`Version ${versionId} not found`);
  }
  return typedRows[0];
};

export const getVersionById = async (versionId: string): Promise<SongVersionRecord | null> => {
  const rows = await sql`
    select
      v.id as "id",
      v.song_id as "songId",
      v.label,
      v.content,
      v.audio_url as "audioUrl",
      v.bpm,
      v.previous_version_id as "previousVersionId",
      v.next_version_id as "nextVersionId",
      v.original_version_id as "originalVersionId",
      v.rendered_content as "renderedContent",
      v.archived as "archived",
      v.created_by as "createdBy",
      v.created_at as "createdAt",
      s.title as "songTitle"
    from song_versions v
    join songs s on v.song_id = s.id
    where v.id = ${versionId} and v.archived = false
  `;
  const typedRows = rows as SongVersionResult[];
  return typedRows.length > 0 ? typedRows[0] : null;
};

export const getPreviousVersionsChain = async (versionId: string): Promise<SongVersionRecord[]> => {
  const currentVersion = await getVersionById(versionId);
  if (!currentVersion) {
    return [];
  }
  
  const originalVersionId = currentVersion.originalVersionId || currentVersion.id;
  
  const rows = await sql`
    select
      v.id as "id",
      v.song_id as "songId",
      v.label,
      v.content,
      v.audio_url as "audioUrl",
      v.bpm,
      v.previous_version_id as "previousVersionId",
      v.next_version_id as "nextVersionId",
      v.original_version_id as "originalVersionId",
      v.rendered_content as "renderedContent",
      v.archived as "archived",
      v.created_by as "createdBy",
      v.created_at as "createdAt"
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

export const createVersionWithLineage = async (params: { songId: string; label: string; content: string | null; audioUrl?: string | null; bpm?: number | null; previousVersionId?: string | null; createdBy?: string | null; }): Promise<SongVersionRecord> => {
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
    bpm: params.bpm,
    previousVersionId: params.previousVersionId,
    originalVersionId: originalVersionId,
    createdBy: params.createdBy,
  });
  
  if (params.previousVersionId) {
    await updateVersionNextId(params.previousVersionId, newVersion.id);
  }
  
  if (!originalVersionId) {
    const rows = await sql`
      update song_versions
      set original_version_id = ${newVersion.id}
      where id = ${newVersion.id}
      returning id, song_id as "songId", label, content, audio_url as "audioUrl", bpm, previous_version_id as "previousVersionId", next_version_id as "nextVersionId", original_version_id as "originalVersionId", rendered_content as "renderedContent", created_by as "createdBy", created_at as "createdAt"
    `;
    return (rows as SongVersionResult[])[0];
  }
  
  return newVersion;
};

export const updateVersion = async (versionId: string, updates: { label?: string; content?: string | null; audioUrl?: string | null; bpm?: number | null; previousVersionId?: string | null; nextVersionId?: string | null; }): Promise<SongVersionRecord> => {
  // Get current version first
  const current = await getVersionById(versionId);
  if (!current) {
    throw new Error(`Version ${versionId} not found`);
  }

  // Determine final values (use update values if provided, otherwise keep current)
  const finalLabel = updates.label !== undefined ? updates.label : current.label;
  const finalContent = updates.content !== undefined ? updates.content : current.content;
  const finalAudioUrl = updates.audioUrl !== undefined ? updates.audioUrl : current.audioUrl;
  const finalBpm = updates.bpm !== undefined ? updates.bpm : current.bpm;
  const finalPreviousVersionId = updates.previousVersionId !== undefined ? updates.previousVersionId : current.previousVersionId;
  const finalNextVersionId = updates.nextVersionId !== undefined ? updates.nextVersionId : current.nextVersionId;

  const rows = await sql`
    update song_versions
    set 
      label = ${finalLabel},
      content = ${finalContent},
      audio_url = ${finalAudioUrl},
      bpm = ${finalBpm},
      previous_version_id = ${finalPreviousVersionId},
      next_version_id = ${finalNextVersionId}
    where id = ${versionId}
    returning id, song_id as "songId", label, content, audio_url as "audioUrl", bpm, previous_version_id as "previousVersionId", next_version_id as "nextVersionId", original_version_id as "originalVersionId", rendered_content as "renderedContent", archived, created_by as "createdBy", created_at as "createdAt"
  `;
  const typedRows = rows as SongVersionResult[];
  if (typedRows.length === 0) {
    throw new Error(`Version ${versionId} not found`);
  }
  return typedRows[0];
};

export const updateVersionRenderedContent = async (versionId: string, renderedContent: RenderedContent): Promise<SongVersionRecord> => {
  const rows = await sql`
    update song_versions
    set rendered_content = ${JSON.stringify(renderedContent)}::jsonb
    where id = ${versionId}
    returning id, song_id as "songId", label, content, audio_url as "audioUrl", bpm, previous_version_id as "previousVersionId", next_version_id as "nextVersionId", original_version_id as "originalVersionId", rendered_content as "renderedContent", archived, created_by as "createdBy", created_at as "createdAt"
  `;
  const typedRows = rows as SongVersionResult[];
  if (typedRows.length === 0) {
    throw new Error(`Version ${versionId} not found`);
  }
  return typedRows[0];
};

export const archiveVersion = async (versionId: string): Promise<SongVersionRecord> => {
  const rows = await sql`
    update song_versions
    set archived = true
    where id = ${versionId} and archived = false
    returning id, song_id as "songId", label, content, audio_url as "audioUrl", bpm, previous_version_id as "previousVersionId", next_version_id as "nextVersionId", original_version_id as "originalVersionId", rendered_content as "renderedContent", archived, created_by as "createdBy", created_at as "createdAt"
  `;
  const typedRows = rows as SongVersionResult[];
  if (typedRows.length === 0) {
    throw new Error(`Version ${versionId} not found or already archived`);
  }

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
      v.next_version_id as "nextVersionId"
    from song_versions v
    join songs s on s.id = v.song_id
    where v.archived = false
      and s.archived = false
    order by s.title asc, v.label asc
  `;
  return rows as { id: string; songId: string; label: string; songTitle: string; createdAt: string; nextVersionId: string | null; }[];
};
