import sql from './db';

export const getUsernameById = async (userId?: string | null): Promise<string | null> => {
  if (!userId) return null;
  const rows = await sql`SELECT username FROM users WHERE id = ${userId}`;
  return rows.length > 0 ? (rows[0] as { username: string }).username : null;
};
