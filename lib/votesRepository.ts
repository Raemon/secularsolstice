import sumBy from 'lodash/sumBy';
import sql from './db';

export type VoteRecord = {
  id: string;
  name: string;
  weight: number;
  type: string;
  versionId: string;
  songId: string;
  createdAt: string;
  category: string;
};

let hasSongIdColumn: boolean | null = null;

const ensureSongIdColumn = async (): Promise<boolean> => {
  if (hasSongIdColumn !== null) {
    return hasSongIdColumn;
  }
  try {
    await sql`select song_id from votes limit 1`;
    hasSongIdColumn = true;
  } catch (error: any) {
    if (error?.code === '42703') {
      hasSongIdColumn = false;
    } else {
      throw error;
    }
  }
  return hasSongIdColumn;
};

export const listVotesForVersion = async (versionId: string, category?: string): Promise<VoteRecord[]> => {
  const hasSongId = await ensureSongIdColumn();
  if (hasSongId) {
    const rows = await sql`
      select
        id,
        name,
        weight,
        type,
        version_id as "versionId",
        song_id as "songId",
        created_at as "createdAt",
        category
      from votes
      where version_id = ${versionId}
        ${category ? sql`and category = ${category}` : sql``}
      order by created_at asc
    `;
    return rows as VoteRecord[];
  }
  const rows = await sql`
    select
      v.id,
      v.name,
      v.weight,
      v.type,
      v.version_id as "versionId",
      sv.song_id as "songId",
      v.created_at as "createdAt",
      v.category
    from votes v
    join song_versions sv on v.version_id = sv.id
    where v.version_id = ${versionId}
      ${category ? sql`and v.category = ${category}` : sql``}
    order by v.created_at asc
  `;
  return rows as VoteRecord[];
};

export const upsertVote = async (params: { versionId: string; songId: string; name: string; weight: number; type: string; category: string }): Promise<VoteRecord> => {
  const hasSongId = await ensureSongIdColumn();
  if (hasSongId) {
    const rows = await sql`
      insert into votes (name, weight, type, version_id, song_id, category)
      values (${params.name}, ${params.weight}, ${params.type}, ${params.versionId}, ${params.songId}, ${params.category})
      on conflict (version_id, name, category) do update
        set weight = excluded.weight,
            type = excluded.type,
            song_id = excluded.song_id,
            created_at = now()
      returning id, name, weight, type, version_id as "versionId", song_id as "songId", created_at as "createdAt", category
    `;
    return (rows as VoteRecord[])[0];
  }
  const rows = await sql`
    with deleted as (
      delete from votes
      where version_id = ${params.versionId}
        and name = ${params.name}
        and category = ${params.category}
      returning 1
    ),
    inserted as (
      insert into votes (name, weight, type, version_id, category)
      values (${params.name}, ${params.weight}, ${params.type}, ${params.versionId}, ${params.category})
      returning id, name, weight, type, version_id as "versionId", created_at as "createdAt", category
    )
    select * from inserted
  `;
  const vote = (rows as VoteRecord[])[0];
  return { ...vote, songId: params.songId };
};

export const deleteVote = async (versionId: string, name: string, category: string): Promise<void> => {
  await sql`
    delete from votes
    where version_id = ${versionId}
      and name = ${name}
      and category = ${category}
  `;
};

export const getVotesSummary = async (versionId: string, category?: string): Promise<{ votes: VoteRecord[]; total: number; }> => {
  const votes = await listVotesForVersion(versionId, category);
  const total = sumBy(votes, 'weight');
  return { votes, total };
};
