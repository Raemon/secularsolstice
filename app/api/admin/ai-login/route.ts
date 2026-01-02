import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyPassword } from '@/lib/authUtils';

// Simple API endpoint for AI agents to login and get admin credentials
// This endpoint returns the user object if credentials are valid
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }
    
    const users = await sql`
      SELECT id, username, password_hash, is_admin, created_at, performed_program_ids, ever_set_username
      FROM users 
      WHERE username = ${username}
    `;
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = users[0] as { 
      id: string; 
      username: string; 
      password_hash: string | null; 
      is_admin: boolean;
      created_at: string;
      performed_program_ids: string[];
      ever_set_username: boolean;
    };
    
    if (!user.password_hash) {
      return NextResponse.json({ error: 'No password set for user' }, { status: 401 });
    }
    
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    if (!user.is_admin) {
      return NextResponse.json({ error: 'User is not an admin' }, { status: 403 });
    }
    
    // Return user info without password hash
    return NextResponse.json({
      id: user.id,
      username: user.username,
      is_admin: user.is_admin,
      created_at: user.created_at,
      performed_program_ids: user.performed_program_ids,
      ever_set_username: user.ever_set_username,
    });
  } catch (error) {
    console.error('AI login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
