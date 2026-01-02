#!/usr/bin/env npx tsx
/**
 * AI Admin Login Script
 * 
 * Creates the AI test admin user, logs in, and returns the user info.
 * Usage: 
 *   npx tsx scripts/aiAdminLogin.ts [port]        - Create user & login
 *   npx tsx scripts/aiAdminLogin.ts delete [port] - Delete the user
 * 
 * Default port is 3000. Pass a port number as argument if your server is on a different port.
 * 
 * Returns JSON with user info including the ID needed for admin API calls.
 */

import path from 'path';
import dotenv from 'dotenv';
import { AI_TEST_ADMIN_USERNAME, AI_TEST_ADMIN_PASSWORD } from './aiTestCredentials';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const query = async <T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> => {
  const { default: sql } = await import('../lib/db');
  const result = await sql(strings, ...values);
  return result as T[];
};

const createUser = async () => {
  const { hashPassword } = await import('../lib/authUtils');
  
  // Check if user already exists
  const existing = await query<{ id: string; username: string; is_admin: boolean }>`
    SELECT id, username, is_admin FROM users WHERE username = ${AI_TEST_ADMIN_USERNAME}
  `;
  
  if (existing.length > 0) {
    const user = existing[0];
    if (!user.is_admin) {
      await query`UPDATE users SET is_admin = true WHERE id = ${user.id}`;
    }
    // Update password to ensure it's current
    const passwordHash = await hashPassword(AI_TEST_ADMIN_PASSWORD);
    await query`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${user.id}`;
    return user.id;
  }
  
  // Create new user
  const passwordHash = await hashPassword(AI_TEST_ADMIN_PASSWORD);
  const result = await query<{ id: string }>`
    INSERT INTO users (username, password_hash, is_admin, ever_set_username)
    VALUES (${AI_TEST_ADMIN_USERNAME}, ${passwordHash}, true, true)
    RETURNING id
  `;
  return result[0].id;
};

const deleteUser = async () => {
  const result = await query<{ id: string }>`
    DELETE FROM users WHERE username = ${AI_TEST_ADMIN_USERNAME} RETURNING id
  `;
  if (result.length > 0) {
    console.log(`Deleted AI test admin user: ${AI_TEST_ADMIN_USERNAME} (${result[0].id})`);
  } else {
    console.log(`AI test admin user not found: ${AI_TEST_ADMIN_USERNAME}`);
  }
};

const login = async (port: string) => {
  const baseUrl = `http://localhost:${port}`;
  
  try {
    // Create user first
    await createUser();
    
    const response = await fetch(`${baseUrl}/api/admin/ai-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: AI_TEST_ADMIN_USERNAME,
        password: AI_TEST_ADMIN_PASSWORD,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Login failed:', error);
      process.exit(1);
    }

    const user = await response.json();
    console.log(JSON.stringify(user, null, 2));
    console.log('\n---');
    console.log(`User ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Is Admin: ${user.is_admin}`);
    console.log('\nUse this ID for admin API calls, e.g.:');
    console.log(`curl "${baseUrl}/api/admin/users?requestingUserId=${user.id}"`);
    console.log('\nTo delete this user when done:');
    console.log(`npx tsx scripts/aiAdminLogin.ts delete`);
  } catch (error: any) {
    if (error.cause?.code === 'ECONNREFUSED') {
      console.error(`Could not connect to server at ${baseUrl}`);
      console.error('Make sure the server is running (yarn dev)');
      console.error(`If it's on a different port, pass it as argument: npx tsx scripts/aiAdminLogin.ts 3002`);
    } else {
      console.error('Login error:', error.message);
    }
    process.exit(1);
  }
};

const run = async () => {
  const args = process.argv.slice(2);
  
  if (args[0] === 'delete') {
    await deleteUser();
    return;
  }
  
  const port = args[0] || '3000';
  await login(port);
};

run().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});