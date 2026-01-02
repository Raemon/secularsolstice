import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import { latestProgramVersionCte } from '@/lib/programsRepository';

export type StatsResponse = {
  songs: { count: number; mostRecent: string | null };
  versions: { count: number; mostRecent: string | null };
  programs: { count: number; mostRecent: string | null };
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestingUserId = searchParams.get('requestingUserId');
  const adminError = await requireAdmin(requestingUserId);
  if (adminError) return adminError;

  const [songsResult, versionsResult, programsResult] = await Promise.all([
    sql`SELECT count(*)::int as count, max(created_at) as most_recent FROM songs WHERE archived = false`,
    sql`SELECT count(*)::int as count, max(created_at) as most_recent FROM song_versions WHERE archived = false`,
    sql`with latest_versions as (${latestProgramVersionCte()})
        SELECT count(*)::int as count, max(lv.created_at) as most_recent
        FROM programs p JOIN latest_versions lv ON lv.program_id = p.id
        WHERE lv.archived = false`,
  ]);

  const stats: StatsResponse = {
    songs: { count: songsResult[0].count, mostRecent: songsResult[0].most_recent },
    versions: { count: versionsResult[0].count, mostRecent: versionsResult[0].most_recent },
    programs: { count: programsResult[0].count, mostRecent: programsResult[0].most_recent },
  };

  return NextResponse.json(stats);
}
