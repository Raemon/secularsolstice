import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { generateUsername } from '@/lib/usernameGenerator';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const result = await sql`SELECT id, username, created_at, performed_program_ids FROM users WHERE id = ${userId}`;
    
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
    let usernameValue = username || generateUsername();
    const isGenerated = !username;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        const result = await sql`INSERT INTO users (username) VALUES (${usernameValue}) RETURNING id, username, created_at, performed_program_ids`;
        return NextResponse.json(result[0]);
      } catch (insertError: any) {
        // Check if it's a duplicate key error
        if (insertError?.code === '23505' && insertError?.constraint === 'users_username_key') {
          // If username was provided by user, return error
          if (!isGenerated) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
          }
          // If generated username collides, try again with a new one
          attempts++;
          if (attempts >= maxAttempts) {
            return NextResponse.json({ error: 'Failed to generate unique username' }, { status: 500 });
          }
          usernameValue = generateUsername();
        } else {
          // Re-throw if it's a different error
          throw insertError;
        }
      }
    }

    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username, performedProgramIds } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    let result;
    try {
      if (username !== undefined && performedProgramIds !== undefined) {
        result = await sql`UPDATE users SET username = ${username}, performed_program_ids = ${performedProgramIds} WHERE id = ${userId} RETURNING id, username, created_at, performed_program_ids`;
      } else if (username !== undefined) {
        result = await sql`UPDATE users SET username = ${username} WHERE id = ${userId} RETURNING id, username, created_at, performed_program_ids`;
      } else if (performedProgramIds !== undefined) {
        result = await sql`UPDATE users SET performed_program_ids = ${performedProgramIds} WHERE id = ${userId} RETURNING id, username, created_at, performed_program_ids`;
      } else {
        return NextResponse.json({ error: 'username or performedProgramIds is required' }, { status: 400 });
      }
    } catch (updateError: any) {
      // Check if it's a duplicate key error for username
      if (updateError?.code === '23505' && updateError?.constraint === 'users_username_key' && username !== undefined) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
      }
      throw updateError;
    }
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
