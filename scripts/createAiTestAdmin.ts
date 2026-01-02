import path from 'path';
import dotenv from 'dotenv';
import { AI_TEST_ADMIN_USERNAME, AI_TEST_ADMIN_PASSWORD } from './aiTestCredentials';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const query = async <T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> => {
  const { default: sql } = await import('../lib/db');
  const result = await sql(strings, ...values);
  return result as T[];
};

const run = async () => {
  const { hashPassword } = await import('../lib/authUtils');
  
  // Check if user already exists
  const existing = await query<{ id: string; username: string; is_admin: boolean }>`
    SELECT id, username, is_admin FROM users WHERE username = ${AI_TEST_ADMIN_USERNAME}
  `;
  
  if (existing.length > 0) {
    const user = existing[0];
    console.log(`AI test admin user already exists: ${user.username} (${user.id})`);
    
    if (!user.is_admin) {
      await query`UPDATE users SET is_admin = true WHERE id = ${user.id}`;
      console.log('User has been promoted to admin.');
    }
    
    // Update password to ensure it's current
    const passwordHash = await hashPassword(AI_TEST_ADMIN_PASSWORD);
    await query`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${user.id}`;
    console.log('Password has been updated.');
    console.log(`\nCredentials:\n  Username: ${AI_TEST_ADMIN_USERNAME}\n  Password: ${AI_TEST_ADMIN_PASSWORD}`);
    return;
  }
  
  // Create new user
  const passwordHash = await hashPassword(AI_TEST_ADMIN_PASSWORD);
  const result = await query<{ id: string }>`
    INSERT INTO users (username, password_hash, is_admin, ever_set_username)
    VALUES (${AI_TEST_ADMIN_USERNAME}, ${passwordHash}, true, true)
    RETURNING id
  `;
  
  console.log(`Created AI test admin user: ${AI_TEST_ADMIN_USERNAME} (${result[0].id})`);
  console.log(`\nCredentials:\n  Username: ${AI_TEST_ADMIN_USERNAME}\n  Password: ${AI_TEST_ADMIN_PASSWORD}`);
};

run().catch((error) => {
  console.error('Failed to create AI test admin:', error);
  process.exit(1);
});
