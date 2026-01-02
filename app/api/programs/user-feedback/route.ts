import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { latestProgramVersionCte } from '@/lib/programsRepository';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');
    const userId = searchParams.get('userId');

    if (!programId) {
      return NextResponse.json({ error: 'programId is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
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

    // Fetch sub-programs and their element IDs
    if (program.program_ids && program.program_ids.length > 0) {
      const subProgramsResult = await sql`
        with latest_versions as (${latestProgramVersionCte()})
        SELECT lv.element_ids
        FROM programs p
        JOIN latest_versions lv ON lv.program_id = p.id
        WHERE p.id = ANY(${program.program_ids}) AND lv.archived = false
      `;
      
      subProgramsResult.forEach((subProgram: any) => {
        allVersionIds = [...allVersionIds, ...(subProgram.element_ids || [])];
      });
    }

    if (allVersionIds.length === 0) {
      return NextResponse.json({ versions: [], votes: [], comments: [] });
    }

    // Fetch all versions
    const versionsResult = await sql`
      SELECT sv.id, sv.song_id, sv.label, sv.created_at, s.tags, s.title as song_title
      FROM song_versions sv
      JOIN songs s ON sv.song_id = s.id
      WHERE sv.id = ANY(${allVersionIds}) AND sv.archived = false
    `;

    // Fetch user's votes for these versions
    const votesResult = await sql`
      SELECT version_id, weight, type, category, created_at
      FROM votes
      WHERE version_id = ANY(${allVersionIds}) AND user_id = ${userId}
    `;

    // Fetch user's comments for these versions
    const commentsResult = await sql`
      SELECT id, version_id, content, user_id, created_at
      FROM comments
      WHERE version_id = ANY(${allVersionIds}) AND user_id = ${userId}
    `;

    return NextResponse.json({
      versions: versionsResult,
      votes: votesResult,
      comments: commentsResult
    });
  } catch (error) {
    console.error('Error fetching program user feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch program user feedback' }, { status: 500 });
  }
}
