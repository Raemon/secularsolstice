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

    // Get all element IDs from program and sub-programs
    const allElementIds = [
      ...(program.elementIds || []),
      ...subPrograms.flatMap(sp => sp.elementIds || [])
    ];

    // Fetch only versions in the program (for metadata display)
    const versionsResult = allElementIds.length > 0 ? await sql`
      SELECT 
        sv.id,
        sv.song_id as "songId",
        sv.label,
        s.title as "songTitle",
        sv.created_at as "createdAt",
        COALESCE(s.tags, ARRAY[]::text[]) as tags
      FROM song_versions sv
      JOIN songs s ON sv.song_id = s.id
      WHERE sv.id = ANY(${allElementIds})
      ORDER BY s.title, sv.label
    ` : [];
    const versions = versionsResult as Array<{id: string; songId: string; label: string; songTitle: string; createdAt: string; tags: string[]}>;

    // Fetch votes for all element IDs in a single query
    // For each version in the program, find all versions with the same label and aggregate votes
    const votesData: Record<string, PublicVoteRecord[]> = {};
    if (allElementIds.length > 0 && versions.length > 0) {
      // Get all matching version IDs in a single query (for vote aggregation)
      // We need ALL versions with the same song_id and label as any program version
      const songIds = versions.map(v => v.songId);
      const matchingVersionsResult = await sql`
        SELECT sv.id, sv.song_id as "songId", sv.label
        FROM song_versions sv
        WHERE sv.archived = false
          AND sv.song_id = ANY(${songIds})
      `;
      const matchingVersions = matchingVersionsResult as Array<{id: string; songId: string; label: string}>;

      // Build a map of versionId -> all matching version IDs (same song + label)
      const versionToMatchingIds: Record<string, string[]> = {};
      for (const versionId of allElementIds) {
        const version = versions.find(v => v.id === versionId);
        if (!version) {
          votesData[versionId] = [];
          continue;
        }
        
        // Find all versions with the same label (for the same song)
        const matchingVersionIds = matchingVersions
          .filter(v => v.songId === version.songId && v.label === version.label)
          .map(v => v.id);
        
        versionToMatchingIds[versionId] = matchingVersionIds;
      }

      // Collect all unique version IDs we need to query
      const allVersionIdsToQuery = [...new Set(Object.values(versionToMatchingIds).flat())];

      // Fetch all votes in a single query
      if (allVersionIdsToQuery.length > 0) {
        const allVotesResult = await sql`
          SELECT 
            id,
            weight,
            type,
            version_id as "versionId",
            song_id as "songId",
            created_at as "createdAt",
            category
          FROM votes
          WHERE version_id = ANY(${allVersionIdsToQuery})
          ORDER BY created_at ASC
        `;
        const allVotes = allVotesResult as PublicVoteRecord[];

        // Group votes by version ID
        const votesByVersionId: Record<string, PublicVoteRecord[]> = {};
        for (const vote of allVotes) {
          if (!votesByVersionId[vote.versionId]) {
            votesByVersionId[vote.versionId] = [];
          }
          votesByVersionId[vote.versionId].push(vote);
        }

        // Aggregate votes for each element
        for (const versionId of allElementIds) {
          const matchingIds = versionToMatchingIds[versionId] || [];
          const aggregatedVotes: PublicVoteRecord[] = [];
          
          for (const matchingId of matchingIds) {
            const votesForVersion = votesByVersionId[matchingId] || [];
            aggregatedVotes.push(...votesForVersion);
          }
          
          votesData[versionId] = aggregatedVotes;
        }
      }
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

