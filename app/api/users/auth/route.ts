import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/authUtils';
import { AuthBody, DbUser } from '@/app/user/types';

function validateInput(body: AuthBody) {
  if (!body.username || !body.password) {
    return { error: 'Username and password are required', status: 400 };
  }
  if (body.password.length < 8) {
    return { error: 'Password must be at least 8 characters', status: 400 };
  }
  return null;
}

function stripPasswordHash(user: DbUser) {
  const { password_hash: _, ...safeUser } = user;
  return safeUser;
}

async function handleLogin(existingUser: DbUser[], password: string) {
  if (existingUser.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (!existingUser[0].password_hash) {
    return NextResponse.json({ error: 'This account has no password set. Contact admin.' }, { status: 401 });
  }
  const passwordMatches = await verifyPassword(password, existingUser[0].password_hash);
  if (passwordMatches) {
    return NextResponse.json(stripPasswordHash(existingUser[0]));
  }
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}

async function handleRegister(existingUser: DbUser[], username: string, password: string, currentUserId?: string) {
  if (existingUser.length > 0) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }
  const passwordHash = await hashPassword(password);
  if (currentUserId) {
    const result = await sql`
      UPDATE users 
      SET username = ${username}, password_hash = ${passwordHash}, ever_set_username = true 
      WHERE id = ${currentUserId} 
      RETURNING id, username, created_at, performed_program_ids, is_admin, ever_set_username
    `;
    if (result.length > 0) {
      return NextResponse.json(result[0]);
    }
  }
  const result = await sql`
    INSERT INTO users (username, password_hash, ever_set_username) 
    VALUES (${username}, ${passwordHash}, true) 
    RETURNING id, username, created_at, performed_program_ids, is_admin, ever_set_username
  `;
  return NextResponse.json(result[0]);
}

export async function POST(request: NextRequest) {
  try {
    const body: AuthBody = await request.json();
    const { username, password, currentUserId, mode } = body;

    const validationError = validateInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError.error }, { status: validationError.status });
    }

    const existingUser = await sql`SELECT id, username, password_hash, created_at, performed_program_ids, is_admin, ever_set_username FROM users WHERE username = ${username}` as DbUser[];

    if (mode === 'login') {
      return handleLogin(existingUser, password);
    }
    if (mode === 'register') {
      return handleRegister(existingUser, username, password, currentUserId);
    }
  } catch (error: any) {
    console.error('Error in auth:', error);
    if (error?.code === '23505' && error?.constraint === 'users_username_key') {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}