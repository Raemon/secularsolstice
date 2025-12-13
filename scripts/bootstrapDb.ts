import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
import crypto from 'crypto';

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
    throw new Error('DATABASE_URL is not set. Cannot bootstrap database.');
  }
};

const getSqlClient = async () => {
  const module = await import('../lib/db');
  return module.default;
};

const sha256 = (input: string) => {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
};

const splitSqlStatements = (sqlText: string) => {
  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag: string | null = null;

  const startsWithAt = (idx: number, needle: string) => sqlText.slice(idx, idx + needle.length) === needle;

  for (let i = 0; i < sqlText.length; i += 1) {
    const ch = sqlText[i];
    const next = i + 1 < sqlText.length ? sqlText[i + 1] : '';

    if (inLineComment) {
      current += ch;
      if (ch === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      current += ch;
      if (ch === '*' && next === '/') {
        current += next;
        i += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && !dollarTag) {
      if (ch === '-' && next === '-') {
        current += ch + next;
        i += 1;
        inLineComment = true;
        continue;
      }
      if (ch === '/' && next === '*') {
        current += ch + next;
        i += 1;
        inBlockComment = true;
        continue;
      }
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (dollarTag) {
        if (startsWithAt(i, dollarTag)) {
          current += dollarTag;
          i += dollarTag.length - 1;
          dollarTag = null;
          continue;
        }
        current += ch;
        continue;
      }

      if (ch === '$') {
        let j = i + 1;
        while (j < sqlText.length) {
          const c = sqlText[j];
          if (c === '$') {
            const tag = sqlText.slice(i, j + 1);
            current += tag;
            i = j;
            dollarTag = tag;
            break;
          }
          if (!/[A-Za-z0-9_]/.test(c)) {
            break;
          }
          j += 1;
        }
        if (dollarTag) {
          continue;
        }
      }
    }

    if (!dollarTag) {
      if (!inDoubleQuote && ch === '\'' && !inSingleQuote) {
        inSingleQuote = true;
        current += ch;
        continue;
      }
      if (inSingleQuote && ch === '\'') {
        if (next === '\'') {
          current += ch + next;
          i += 1;
          continue;
        }
        inSingleQuote = false;
        current += ch;
        continue;
      }

      if (!inSingleQuote && ch === '"' && !inDoubleQuote) {
        inDoubleQuote = true;
        current += ch;
        continue;
      }
      if (inDoubleQuote && ch === '"') {
        inDoubleQuote = false;
        current += ch;
        continue;
      }
    }

    if (!inSingleQuote && !inDoubleQuote && !dollarTag && ch === ';') {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += ch;
  }

  const trimmed = current.trim();
  if (trimmed) {
    statements.push(trimmed);
  }
  return statements;
};

const ensureMigrationsTable = async (sql: Awaited<ReturnType<typeof getSqlClient>>) => {
  await sql`create table if not exists schema_migrations (
    filename text primary key,
    checksum text not null,
    applied_at timestamptz not null default now()
  );`;
};

const assertDatabaseLooksEmpty = async (sql: Awaited<ReturnType<typeof getSqlClient>>) => {
  const rows = await sql`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE';` as unknown as { table_name: string }[];
  const nonMigrationsTables = rows.map(r => r.table_name).filter(t => t !== 'schema_migrations');
  if (nonMigrationsTables.length > 0) {
    throw new Error(`Refusing to bootstrap: database already has tables: ${nonMigrationsTables.sort().join(', ')}`);
  }
};

const runSqlFile = async (sql: Awaited<ReturnType<typeof getSqlClient>>, filePath: string) => {
  const fileContents = (await fs.readFile(filePath, 'utf-8')).trim();
  if (!fileContents) {
    return;
  }
  const statements = splitSqlStatements(fileContents);
  for (const statement of statements) {
    await sql`${sql.unsafe(`${statement};`)}`;
  }
};

const markAllMigrationsApplied = async (sql: Awaited<ReturnType<typeof getSqlClient>>) => {
  const migrationsDir = path.resolve(process.cwd(), 'db/migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const fileContents = (await fs.readFile(filePath, 'utf-8')).trim();
    const checksum = sha256(fileContents);
    await sql`insert into schema_migrations (filename, checksum) values (${file}, ${checksum}) on conflict (filename) do nothing;`;
  }
};

const bootstrapDb = async () => {
  loadEnvFiles();
  assertDatabaseUrl();
  const sql = await getSqlClient();
  await ensureMigrationsTable(sql);
  await assertDatabaseLooksEmpty(sql);

  console.log('Bootstrapping schema from db/schema.sql...');
  await runSqlFile(sql, path.resolve(process.cwd(), 'db/schema.sql'));
  await markAllMigrationsApplied(sql);
  console.log('Bootstrap complete.');
};

bootstrapDb().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});


