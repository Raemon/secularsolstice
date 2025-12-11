import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { generateUsername } from '@/lib/usernameGenerator';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const result = await sql`SELECT id, username, created_at FROM users WHERE id = ${userId}`;
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    // Generate a random username if none provided
    const usernameValue = username || generateUsername();
    const result = await sql`INSERT INTO users (username) VALUES (${usernameValue}) RETURNING id, username, created_at`;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username } = body;
    
    if (!userId || username === undefined) {
      return NextResponse.json({ error: 'userId and username are required' }, { status: 400 });
    }

    const result = await sql`UPDATE users SET username = ${username} WHERE id = ${userId} RETURNING id, username, created_at`;
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
