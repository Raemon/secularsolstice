import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
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
    throw new Error('DATABASE_URL is not set. Cannot generate schema snapshot.');
  }
};

const runPgDump = (connectionString: string) => {
  return new Promise<string>((resolve, reject) => {
    const args = ['--schema-only', '--no-owner', '--no-privileges', connectionString];
    const child = spawn('pg_dump', args, { env: process.env });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to execute pg_dump: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`pg_dump exited with code ${code}: ${stderr || 'no stderr output'}`));
      }
    });
  });
};

type SnapshotOptions = {
  schemaFile?: string;
};

export const generateSchemaSnapshot = async (options: SnapshotOptions = {}) => {
  loadEnvFiles();
  assertDatabaseUrl();

  const schemaFile = options.schemaFile ?? 'db/schema.sql';
  const schemaPath = path.resolve(process.cwd(), schemaFile);
  const connectionString = process.env.DATABASE_URL as string;
  const dump = await runPgDump(connectionString);

  await fs.writeFile(schemaPath, dump);
  console.log(`Schema snapshot written to ${schemaFile}`);
};

if (require.main === module) {
  generateSchemaSnapshot().catch((error) => {
    console.error('Schema snapshot generation failed:', error);
    process.exit(1);
  });
}


