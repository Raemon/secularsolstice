import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { downloadBackup, uploadBackup } from '@/lib/r2';
import sql from '@/lib/db';
import { gunzipSync, gzipSync } from 'zlib';

type TableRow = Record<string, unknown>;

const escapeValue = (val: unknown): string => {
  if (val === null) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (Array.isArray(val)) {
    if (val.length === 0) return "'{}'";
    return `ARRAY[${val.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]`;
  }
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
};

const createSafetyBackup = async (): Promise<string> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `pre-restore-${timestamp}.sql.gz`;

  // Fetch all data from tables using tagged template literals
  const [songs, programs, songVersions, comments, votes, users] = await Promise.all([
    sql`SELECT * FROM songs`,
    sql`SELECT * FROM programs`,
    sql`SELECT * FROM song_versions`,
    sql`SELECT * FROM comments`,
    sql`SELECT * FROM votes`,
    sql`SELECT * FROM users`,
  ]);

  const tables: Record<string, TableRow[]> = {
    songs: songs as TableRow[],
    programs: programs as TableRow[],
    song_versions: songVersions as TableRow[],
    comments: comments as TableRow[],
    votes: votes as TableRow[],
    users: users as TableRow[],
  };

  const sqlStatements: string[] = [];

  // Delete statements (children first)
  sqlStatements.push('DELETE FROM votes;');
  sqlStatements.push('DELETE FROM comments;');
  sqlStatements.push('DELETE FROM song_versions;');
  sqlStatements.push('DELETE FROM songs;');
  sqlStatements.push('DELETE FROM programs;');
  sqlStatements.push('DELETE FROM users;');

  // Insert statements (parents first)
  const insertOrder = ['users', 'songs', 'programs', 'song_versions', 'comments', 'votes'];
  for (const table of insertOrder) {
    const rows = tables[table];
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = columns.map(col => escapeValue(row[col]));
      sqlStatements.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`);
    }
  }

  const compressed = gzipSync(Buffer.from(sqlStatements.join('\n'), 'utf-8'));
  await uploadBackup(filename, compressed);
  return filename;
};

const executeSqlStatements = async (sqlContent: string): Promise<void> => {
  // Split by semicolons, being careful with strings
  const statements = sqlContent
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => {
      if (s.length === 0) return false;
      if (s.startsWith('--')) return false;
      if (s.startsWith('SET ')) return false;
      if (s.startsWith('SELECT pg_catalog')) return false;
      const lower = s.toLowerCase();
      return lower.startsWith('insert into') ||
             lower.startsWith('delete from') ||
             lower.startsWith('update ') ||
             lower.startsWith('truncate ') ||
             lower.startsWith('copy ');
    });

  for (const statement of statements) {
    try {
      // Use raw query execution - wrap statement in array for tagged template
      const parts = [statement.endsWith(';') ? statement : statement + ';'] as unknown as TemplateStringsArray;
      await sql(parts);
    } catch (error) {
      console.error('Failed to execute statement:', statement.slice(0, 200));
      throw error;
    }
  }
};

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestingUserId = searchParams.get('requestingUserId');
  const adminError = await requireAdmin(requestingUserId);
  if (adminError) return adminError;

  try {
    const body = await request.json();
    const { filename } = body;
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Step 1: Create safety backup
    const safetyBackupFilename = await createSafetyBackup();
    console.log(`Created safety backup: ${safetyBackupFilename}`);

    // Step 2: Download the backup to restore
    const compressedData = await downloadBackup(filename);
    const sqlContent = gunzipSync(compressedData).toString('utf-8');

    // Step 3: Clear existing data and restore
    try {
      // Delete in dependency order using tagged template literals
      await sql`DELETE FROM votes`;
      await sql`DELETE FROM comments`;
      await sql`DELETE FROM song_versions`;
      await sql`DELETE FROM songs`;
      await sql`DELETE FROM programs`;

      // Execute the restore SQL
      await executeSqlStatements(sqlContent);

      return NextResponse.json({
        success: true,
        message: 'Database restored successfully',
        safetyBackup: safetyBackupFilename,
      });
    } catch (restoreError) {
      console.error('Restore failed, safety backup available:', safetyBackupFilename);
      throw restoreError;
    }
  } catch (error) {
    console.error('Restore failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Restore failed', details: message }, { status: 500 });
  }
}