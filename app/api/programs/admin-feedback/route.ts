import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import { latestProgramVersionCte } from '@/lib/programsRepository';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const requestingUserId = searchParams.get('requestingUserId');
  const adminError = await requireAdmin(requestingUserId);
  if (adminError) return adminError;

  try {
    const programId = searchParams.get('programId');
    if (!programId) {
      return NextResponse.json({ error: 'programId is required' }, { status: 400 });
    }

    // Get the program and its element IDs (including from sub-programs)
    const programResult = await sql`
      with latest_versions as (${latestProgramVersionCte()})
      SELECT p.id, lv.title, lv.element_ids, lv.program_ids
      FROM programs p
      JOIN latest_versions lv ON lv.program_id = p.id
      WHERE p.id = ${programId} AND lv.archived = false
    `;

    if (programResult.length === 0) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const program = programResult[0];
    let allVersionIds: string[] = [...(program.element_ids || [])];

    // Fetch sub-programs and their element IDs in order
    if (program.program_ids && program.program_ids.length > 0) {
      const subProgramsResult = await sql`
        with latest_versions as (${latestProgramVersionCte()})
        SELECT p.id, lv.element_ids
        FROM programs p
        JOIN latest_versions lv ON lv.program_id = p.id
        WHERE p.id = ANY(${program.program_ids}) AND lv.archived = false
      `;
      // Create a map for quick lookup
      const subProgramMap: Record<string, string[]> = {};
      subProgramsResult.forEach((sp: any) => {
        subProgramMap[sp.id] = sp.element_ids || [];
      });
      // Add elements in the order of program_ids
      program.program_ids.forEach((subId: string) => {
        if (subProgramMap[subId]) {
          allVersionIds = [...allVersionIds, ...subProgramMap[subId]];
        }
      });
    }

    if (allVersionIds.length === 0) {
      return NextResponse.json({ program: { id: program.id, title: program.title }, users: [] });
    }

    // Fetch all versions with song info
    const versionsResult = await sql`
      SELECT sv.id, sv.song_id, sv.label, s.title as song_title, s.tags
      FROM song_versions sv
      JOIN songs s ON sv.song_id = s.id
      WHERE sv.id = ANY(${allVersionIds}) AND sv.archived = false
    `;

    // Fetch all votes for these versions with user info
    const votesResult = await sql`
      SELECT v.version_id, v.weight, v.type, v.category, v.user_id, v.created_at, u.username
      FROM votes v
      LEFT JOIN users u ON v.user_id = u.id
      WHERE v.version_id = ANY(${allVersionIds})
      ORDER BY v.created_at DESC
    `;

    // Fetch all comments for these versions with user info
    const commentsResult = await sql`
      SELECT c.id, c.version_id, c.content, c.user_id, c.created_at, u.username
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.version_id = ANY(${allVersionIds})
      ORDER BY c.created_at DESC
    `;

    // Group feedback by user
    const userFeedbackMap: Record<string, {
      userId: string;
      username: string | null;
      votes: any[];
      comments: any[];
    }> = {};

    votesResult.forEach((vote: any) => {
      const key = vote.user_id || 'anonymous';
      if (!userFeedbackMap[key]) {
        userFeedbackMap[key] = { userId: vote.user_id, username: vote.username, votes: [], comments: [] };
      }
      userFeedbackMap[key].votes.push(vote);
    });

    commentsResult.forEach((comment: any) => {
      const key = comment.user_id || 'anonymous';
      if (!userFeedbackMap[key]) {
        userFeedbackMap[key] = { userId: comment.user_id, username: comment.username, votes: [], comments: [] };
      }
      userFeedbackMap[key].comments.push(comment);
    });

    const users = Object.values(userFeedbackMap).sort((a, b) => {
      const aName = a.username || '';
      const bName = b.username || '';
      return aName.localeCompare(bName);
    });

    return NextResponse.json({
      program: { id: program.id, title: program.title },
      versions: versionsResult,
      users,
      orderedVersionIds: allVersionIds
    });
  } catch (error) {
    console.error('Error fetching admin feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch admin feedback' }, { status: 500 });
  }
}
