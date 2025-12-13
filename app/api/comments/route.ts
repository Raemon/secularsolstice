import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const songId = searchParams.get('songId');
    const songIds = searchParams.get('songIds');

    // Return all comments if no query parameters provided
    if (!songId && !songIds) {
      const result = await sql`
        SELECT 
          c.id, 
          c.version_id, 
          c.content, 
          c.user_id,
          c.created_at,
          sv.label as version_label,
          sv.song_id,
          s.title as song_title
        FROM comments c
        JOIN song_versions sv ON c.version_id = sv.id
        JOIN songs s ON sv.song_id = s.id
        WHERE sv.archived = false AND s.archived = false
        ORDER BY c.created_at DESC
      `;

      return NextResponse.json(result);
    }

    // Handle batch request with multiple songIds
    if (songIds) {
      const songIdArray = songIds.split(',').filter(Boolean);
      if (songIdArray.length === 0) {
        return NextResponse.json({ error: 'songIds cannot be empty' }, { status: 400 });
      }

      const result = await sql`
        SELECT c.id, c.version_id, c.content, c.user_id, c.created_at, sv.label as version_label
        FROM comments c
        JOIN song_versions sv ON c.version_id = sv.id
        WHERE sv.song_id = ANY(${songIdArray}) AND sv.archived = false
        ORDER BY c.created_at DESC
      `;

      return NextResponse.json(result);
    }

    // Handle single songId request
    const result = await sql`
      SELECT c.id, c.version_id, c.content, c.user_id, c.created_at, sv.label as version_label
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
    const { versionId, content, userId } = body;

    if (!versionId || !content) {
      return NextResponse.json(
        { error: 'versionId and content are required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO comments (version_id, content, created_by, user_id)
      VALUES (${versionId}, ${content}, '', ${userId})
      RETURNING id, version_id, content, user_id, created_at
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId, content, userId } = body;

    if (!commentId || !content) {
      return NextResponse.json(
        { error: 'commentId and content are required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE comments
      SET content = ${content}
      WHERE id = ${commentId} AND user_id = ${userId}
      RETURNING id, version_id, content, user_id, created_at
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Comment not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

