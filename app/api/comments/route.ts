import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const songId = searchParams.get('songId');

    if (!songId) {
      return NextResponse.json({ error: 'songId is required' }, { status: 400 });
    }

    // Get all comments for versions of this song
    const result = await sql`
      SELECT c.id, c.version_id, c.content, c.created_by, c.created_at, sv.label as version_label
      FROM comments c
      JOIN song_versions sv ON c.version_id = sv.id
      WHERE sv.song_id = ${songId} AND sv.archived = false
      ORDER BY c.created_at DESC
    `;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { versionId, content, createdBy } = body;

    if (!versionId || !content || !createdBy) {
      return NextResponse.json(
        { error: 'versionId, content, and createdBy are required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO comments (version_id, content, created_by)
      VALUES (${versionId}, ${content}, ${createdBy})
      RETURNING id, version_id, content, created_by, created_at
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

