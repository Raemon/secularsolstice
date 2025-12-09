import sql from './lib/db';

async function checkVotes() {
  const votes = await sql`SELECT name, weight, type, category FROM votes ORDER BY created_at DESC LIMIT 5`;
  console.log('Recent votes:', votes);
  process.exit(0);
}

checkVotes();

