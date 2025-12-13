import path from 'path';
import dotenv from 'dotenv';
import sql from '../lib/db';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const query = async <T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> => {
  const result = await sql(strings, ...values);
  return result as T[];
};

const userId = process.argv[2];

if (!userId) {
  console.error('Usage: tsx scripts/setUserAdmin.ts <user-id>');
  process.exit(1);
}

const run = async () => {
  const existing = await query<{ id: string; username: string | null; is_admin: boolean }>`
    select id, username, is_admin from users where id = ${userId}
  `;
  if (existing.length === 0) {
    console.error(`User with ID ${userId} not found`);
    process.exit(1);
  }
  const user = existing[0];
  console.log(`Current user: ${user.username || '(no username)'}, Admin: ${user.is_admin}`);
  await query`
    update users set is_admin = true where id = ${userId}
  `;
  console.log(`User ${userId} has been set as admin`);
};

run().catch((error) => {
  console.error('Failed to set user as admin:', error);
  process.exit(1);
});









