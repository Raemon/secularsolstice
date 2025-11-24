import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

const loadEnvFiles = () => {
  const envFiles = ['.env', '.env.local'];
  for (const file of envFiles) {
    const envPath = path.resolve(process.cwd(), file);
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
    }
  }
};

const assertDatabaseUrl = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Cannot run migrations.');
  }
};

const getSqlClient = async () => {
  const module = await import('../lib/db');
  return module.default;
};

const runMigrations = async () => {
  loadEnvFiles();
  assertDatabaseUrl();
  const sql = await getSqlClient();
  const migrationsDir = path.resolve(process.cwd(), 'db/migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migrations to run.');
    return;
  }

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const fileContents = (await fs.readFile(filePath, 'utf-8')).trim();

    if (!fileContents) {
      console.log(`Skipping empty migration ${file}`);
      continue;
    }

    const statements = fileContents
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    console.log(`Running migration ${file}...`);
    for (const statement of statements) {
      await sql`${sql.unsafe(`${statement};`)}`;
    }
    console.log(`Finished migration ${file}`);
  }

  console.log('All migrations complete.');
};

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});


