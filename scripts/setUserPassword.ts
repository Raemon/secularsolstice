import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const query = async <T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> => {
  const { default: sql } = await import('../lib/db');
  const result = await sql(strings, ...values);
  return result as T[];
};

const userId = process.argv[2];
const password = process.argv[3];

if (!userId || !password) {
  console.error('Usage: tsx scripts/setUserPassword.ts <user-id> <password>');
  process.exit(1);
}

const run = async () => {
  const { hashPassword } = await import('../lib/authUtils');
  
  const existing = await query<{ id: string; username: string | null }>`
    select id, username from users where id = ${userId}
  `;
  if (existing.length === 0) {
    console.error(`User with ID ${userId} not found`);
    process.exit(1);
  }
  const user = existing[0];
  console.log(`Setting password for user: ${user.username || '(no username)'}`);
  
  const passwordHash = await hashPassword(password);
  await query`
    update users set password_hash = ${passwordHash} where id = ${userId}
  `;
  console.log(`Password has been set for user ${userId}`);
};

run().catch((error) => {
  console.error('Failed to set password:', error);
  process.exit(1);
});