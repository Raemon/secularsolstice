import { NextRequest, NextResponse } from 'next/server';
import { getProgramById } from '@/lib/programsRepository';
import { listVotesForVersion, type PublicVoteRecord, type VoteRecord } from '@/lib/votesRepository';
import sql from '@/lib/db';

export async function GET(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const program = await getProgramById(id);
    if (!program) {
      return NextResponse.json({error: 'Program not found'}, {status: 404});
    }

    // Fetch sub-programs
    const subPrograms = [];
    if (program.programIds && program.programIds.length > 0) {
      const subProgramPromises = program.programIds.map((subId) => getProgramById(subId));
      const results = await Promise.all(subProgramPromises);
      subPrograms.push(...results.filter(p => p !== null));
    }

    // Fetch all versions
    const versionsResult = await sql`
      SELECT 
        sv.id,
        sv.song_id as "songId",
        sv.label,
        s.title as "songTitle",
        sv.created_at as "createdAt",
        COALESCE(s.tags, ARRAY[]::text[]) as tags
      FROM song_versions sv
      JOIN songs s ON sv.song_id = s.id
      WHERE sv.archived = false
      ORDER BY s.title, sv.label
    `;
    const versions = versionsResult as Array<{id: string; songId: string; label: string; songTitle: string; createdAt: string; tags: string[]}>;

    // Get all element IDs from program and sub-programs
    const allElementIds = [
      ...(program.elementIds || []),
      ...subPrograms.flatMap(sp => sp.elementIds || [])
    ];

    // Fetch votes for all element IDs
    // listVotesForVersion already excludes user_id for privacy
    const votesData: Record<string, PublicVoteRecord[]> = {};
    if (allElementIds.length > 0) {
      await Promise.all(
        allElementIds.map(async (versionId) => {
          const [qualityVotes, singabilityVotes] = await Promise.all([
            listVotesForVersion(versionId, 'quality'),
            listVotesForVersion(versionId, 'singability')
          ]);
          votesData[versionId] = [
            ...qualityVotes,
            ...singabilityVotes
          ];
        })
      );
    }

    // Fetch comments for all songs
    const uniqueSongIds = [...new Set(allElementIds.map(id => {
      const version = versions.find(v => v.id === id);
      return version?.songId;
    }).filter(Boolean))];

    const commentsData: Record<string, any[]> = {};
    if (uniqueSongIds.length > 0) {
      const commentsResult = await sql`
        SELECT c.id, c.version_id, c.content, c.created_by, c.created_at, sv.label as version_label
        FROM comments c
        JOIN song_versions sv ON c.version_id = sv.id
        WHERE sv.song_id = ANY(${uniqueSongIds}) AND sv.archived = false
        ORDER BY c.created_at DESC
      `;
      
      (commentsResult as any[]).forEach((comment) => {
        if (!commentsData[comment.version_id]) {
          commentsData[comment.version_id] = [];
        }
        commentsData[comment.version_id].push(comment);
      });
    }

    return NextResponse.json({
      program,
      subPrograms,
      versions,
      votes: votesData,
      comments: commentsData
    });
  } catch (error) {
    console.error('Failed to load results:', error);
    return NextResponse.json({error: 'Failed to load results'}, {status: 500});
  }
}

