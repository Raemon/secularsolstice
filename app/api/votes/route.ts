import { NextResponse } from 'next/server';
import { getVotesSummary, upsertVote, deleteVote } from '@/lib/votesRepository';
import { getVersionById } from '@/lib/songsRepository';
import sql from '@/lib/db';

const VALID_WEIGHTS = new Set([-3, -1, 0, 1, 3]);
const VALID_TYPES = new Set(['Hate', 'Dislike', 'Eh', 'Like', 'Love', 'Easy', 'Med', 'Hard']);
const VALID_CATEGORIES = new Set(['quality', 'singability']);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');
    const category = searchParams.get('category');
    const userId = searchParams.get('userId'); // Optional: for checking if user has voted

    // Return all votes if no versionId provided
    if (!versionId) {
      const result = await sql`
        SELECT 
          v.id, 
          v.weight, 
          v.type,
          v.category,
          v.version_id, 
          v.created_at,
          sv.label as version_label,
          sv.song_id,
          s.title as song_title
        FROM votes v
        JOIN song_versions sv ON v.version_id = sv.id
        JOIN songs s ON sv.song_id = s.id
        WHERE sv.archived = false AND s.archived = false
        ORDER BY v.created_at DESC
      `;
      return NextResponse.json(result);
    }

    const summary = await getVotesSummary(versionId, category || undefined, userId || undefined);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to load votes:', error);
    return NextResponse.json({ error: 'Failed to load votes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { versionId, songId, userId, name, weight, type, category } = body;

    if (!versionId) {
      return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return NextResponse.json({ error: 'name is required and must be at least 3 characters' }, { status: 400 });
    }

    if (typeof weight !== 'number' || !VALID_WEIGHTS.has(weight)) {
      return NextResponse.json({ error: 'weight is invalid' }, { status: 400 });
    }

    if (!type || typeof type !== 'string' || !VALID_TYPES.has(type)) {
      return NextResponse.json({ error: 'type is invalid' }, { status: 400 });
    }

    if (!category || typeof category !== 'string' || !VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: 'category is invalid' }, { status: 400 });
    }

    let resolvedSongId = songId;
    if (!resolvedSongId) {
      const version = await getVersionById(versionId);
      if (!version) {
        return NextResponse.json({ error: 'Version not found' }, { status: 404 });
      }
      resolvedSongId = version.songId;
    }

    await upsertVote({
      versionId,
      songId: resolvedSongId,
      userId,
      name: name.trim(),
      weight,
      type,
      category,
    });

    const summary = await getVotesSummary(versionId, category, userId);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to save vote:', error);
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');

    if (!versionId) {
      return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!category || !VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: 'category is invalid' }, { status: 400 });
    }

    await deleteVote(versionId, userId, category);

    // Pass userId to get user's vote status
    const summary = await getVotesSummary(versionId, category, userId);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to delete vote:', error);
    return NextResponse.json({ error: 'Failed to delete vote' }, { status: 500 });
  }
}

