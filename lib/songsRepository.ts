import groupBy from 'lodash/groupBy';
import sql from './db';

export type SongRecord = {
  id: string;
  title: string;
  createdAt: string;
};

export type SongVersionRecord = {
  id: string;
  songId: string;
  label: string;
  content: string | null;
  audioUrl: string | null;
  previousVersionId: string | null;
  createdAt: string;
};

export type SongWithVersions = SongRecord & {
  versions: SongVersionRecord[];
};

type SongVersionQueryRow = {
  song_id: string;
  title: string;
  song_created_at: string;
  version_id: string | null;
  label: string | null;
  content: string | null;
  audio_url: string | null;
  previous_version_id: string | null;
  version_created_at: string | null;
};

type SongRowResult = {
  id: string;
  title: string;
  createdAt: string;
};

type SongVersionResult = {
  id: string;
  songId: string;
  label: string;
  content: string | null;
  audioUrl: string | null;
  previousVersionId: string | null;
  createdAt: string;
};

const mapSongRow = (row: SongVersionQueryRow): SongRecord => ({
  id: row.song_id,
  title: row.title,
  createdAt: row.song_created_at,
});

const mapVersionRow = (row: SongVersionQueryRow): SongVersionRecord => ({
  id: row.version_id as string,
  songId: row.song_id,
  label: row.label as string,
  content: row.content,
  audioUrl: row.audio_url,
  previousVersionId: row.previous_version_id,
  createdAt: row.version_created_at as string,
});

const hasVersionData = (row: SongVersionQueryRow): row is SongVersionQueryRow & Required<Pick<SongVersionQueryRow, 'version_id' | 'label' | 'version_created_at'>> => Boolean(row.version_id);

export const listSongsWithVersions = async (): Promise<SongWithVersions[]> => {
  const rows = await sql`
    select
      s.id as song_id,
      s.title,
      s.created_at as song_created_at,
      v.id as version_id,
      v.label,
      v.content,
      v.audio_url,
      v.previous_version_id,
      v.created_at as version_created_at
    from songs s
    left join song_versions v on v.song_id = s.id
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
      s.created_at as song_created_at,
      v.id as version_id,
      v.label,
      v.content,
      v.audio_url,
      v.previous_version_id,
      v.created_at as version_created_at
    from songs s
    left join song_versions v on v.song_id = s.id
    where s.id = ${songId}
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

export const createSong = async (title: string): Promise<SongRecord> => {
  const rows = await sql`
    insert into songs (title)
    values (${title})
    returning id, title, created_at as "createdAt"
  `;
  return (rows as SongRowResult[])[0];
};

export const createVersion = async (params: { songId: string; label: string; content: string | null; audioUrl?: string | null; previousVersionId?: string | null; }): Promise<SongVersionRecord> => {
  const rows = await sql`
    insert into song_versions (song_id, label, content, audio_url, previous_version_id)
    values (${params.songId}, ${params.label}, ${params.content}, ${params.audioUrl ?? null}, ${params.previousVersionId ?? null})
    returning id, song_id as "songId", label, content, audio_url as "audioUrl", previous_version_id as "previousVersionId", created_at as "createdAt"
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
      v.previous_version_id as "previousVersionId",
      v.created_at as "createdAt"
    from song_versions v
    join songs s on s.id = v.song_id
    where s.title = ${songTitle} and v.label = ${label}
    order by v.created_at desc
    limit 1
  `;
  const typedRows = rows as SongVersionResult[];
  return typedRows.length > 0 ? typedRows[0] : null;
};

export const updateVersionContent = async (versionId: string, content: string | null): Promise<SongVersionRecord> => {
  const rows = await sql`
    update song_versions
    set content = ${content}
    where id = ${versionId}
    returning id, song_id as "songId", label, content, audio_url as "audioUrl", previous_version_id as "previousVersionId", created_at as "createdAt"
  `;
  const typedRows = rows as SongVersionResult[];
  if (typedRows.length === 0) {
    throw new Error(`Version ${versionId} not found`);
  }
  return typedRows[0];
};

