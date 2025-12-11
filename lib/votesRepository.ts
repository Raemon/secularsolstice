import sumBy from 'lodash/sumBy';
import sql from './db';

export type VoteRecord = {
  id: string;
  weight: number;
  type: string;
  versionId: string;
  songId: string;
  createdAt: string;
  category: string;
  userId?: string;
};

export type PublicVoteRecord = {
  id: string;
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

// Returns votes WITHOUT user_id for privacy - use for public API responses
export const listVotesForVersion = async (versionId: string, category?: string): Promise<PublicVoteRecord[]> => {
  const hasSongId = await ensureSongIdColumn();
  if (hasSongId) {
    const rows = await sql`
      select
        id,
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
    return rows as PublicVoteRecord[];
  }
  const rows = await sql`
    select
      v.id,
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
  return rows as PublicVoteRecord[];
};

export const upsertVote = async (params: { versionId: string; songId: string; userId: string; weight: number; type: string; category: string }): Promise<VoteRecord> => {
  const hasSongId = await ensureSongIdColumn();
  if (hasSongId) {
    const rows = await sql`
      insert into votes (user_id, weight, type, version_id, song_id, category)
      values (${params.userId}, ${params.weight}, ${params.type}, ${params.versionId}, ${params.songId}, ${params.category})
      on conflict (version_id, user_id, category) where user_id is not null do update
        set weight = excluded.weight,
            type = excluded.type,
            song_id = excluded.song_id,
            created_at = now()
      returning id, weight, type, version_id as "versionId", song_id as "songId", created_at as "createdAt", category
    `;
    return (rows as VoteRecord[])[0];
  }
  const rows = await sql`
    with deleted as (
      delete from votes
      where version_id = ${params.versionId}
        and user_id = ${params.userId}
        and category = ${params.category}
      returning 1
    ),
    inserted as (
      insert into votes (user_id, weight, type, version_id, category)
      values (${params.userId}, ${params.weight}, ${params.type}, ${params.versionId}, ${params.category})
      returning id, weight, type, version_id as "versionId", created_at as "createdAt", category
    )
    select * from inserted
  `;
  const vote = (rows as VoteRecord[])[0];
  return { ...vote, songId: params.songId };
};

export const deleteVote = async (versionId: string, userId: string, category: string): Promise<void> => {
  await sql`
    delete from votes
    where version_id = ${versionId}
      and user_id = ${userId}
      and category = ${category}
  `;
};

export const getVotesSummary = async (versionId: string, category?: string, currentUserId?: string): Promise<{ votes: PublicVoteRecord[]; total: number; hasVoted: boolean; currentUserVote?: PublicVoteRecord; }> => {
  const votes = await listVotesForVersion(versionId, category);
  const total = sumBy(votes, 'weight');
  
  // Check if current user has voted (if userId provided)
  let hasVoted = false;
  let currentUserVote: PublicVoteRecord | undefined;
  if (currentUserId) {
    // Query excludes user_id for privacy
    const userVoteById = await sql`
      select id, weight, type, version_id as "versionId", song_id as "songId", created_at as "createdAt", category
      from votes
      where version_id = ${versionId}
        and user_id = ${currentUserId}
        ${category ? sql`and category = ${category}` : sql``}
      limit 1
    `;
    if (userVoteById.length > 0) {
      hasVoted = true;
      currentUserVote = userVoteById[0] as PublicVoteRecord;
    }
  }
  
  return { votes, total, hasVoted, currentUserVote };
};
