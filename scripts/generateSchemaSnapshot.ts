import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
import groupBy from 'lodash/groupBy';

type ColumnRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
};

type ConstraintRow = {
  table_name: string;
  constraint_name: string;
  definition: string;
};

type IndexRow = {
  table_name: string;
  indexname: string;
  indexdef: string;
};

type ExtensionRow = {
  extname: string;
};

type TableRow = {
  table_name: string;
};

type SqlClient = Awaited<ReturnType<typeof getSqlClient>>;

const getSqlClient = async () => {
  const dbModule = await import('../lib/db');
  return dbModule.default;
};

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

const fetchExtensions = async (sql: SqlClient) => {
  const rows = await sql`
    select extname
    from pg_extension
    where extname not in ('plpgsql')
    order by extname
  `;
  return rows as ExtensionRow[];
};

const fetchTables = async (sql: SqlClient) => {
  const rows = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `;
  return rows as TableRow[];
};

const fetchColumns = async (sql: SqlClient) => {
  const rows = await sql`
    select
      table_name,
      column_name,
      data_type,
      udt_name,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position
  `;
  return rows as ColumnRow[];
};

const fetchConstraints = async (sql: SqlClient) => {
  const rows = await sql`
    select
      rel.relname as table_name,
      con.conname as constraint_name,
      pg_get_constraintdef(con.oid, true) as definition
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
    order by rel.relname, con.conname
  `;
  return rows as ConstraintRow[];
};

const fetchIndexes = async (sql: SqlClient) => {
  const rows = await sql`
    select tablename as table_name, indexname, indexdef
    from pg_indexes
    where schemaname = 'public'
    order by tablename, indexname
  `;
  return rows as IndexRow[];
};

const formatDataType = (column: ColumnRow) => {
  if (column.data_type === 'ARRAY') {
    return `${column.udt_name.replace(/^_/, '')}[]`;
  }

  if (column.data_type === 'USER-DEFINED') {
    return column.udt_name;
  }

  if (column.data_type === 'character varying' && column.character_maximum_length) {
    return `varchar(${column.character_maximum_length})`;
  }

  if (column.data_type === 'timestamp with time zone') {
    return 'timestamptz';
  }

  return column.data_type;
};

const formatColumn = (column: ColumnRow) => {
  const parts = [formatDataType(column)];
  if (column.is_nullable === 'NO') {
    parts.push('not null');
  }
  if (column.column_default) {
    parts.push(`default ${column.column_default}`);
  }
  return `${column.column_name} ${parts.join(' ')}`;
};

const formatConstraint = (constraint: ConstraintRow) => {
  return `constraint ${constraint.constraint_name} ${constraint.definition}`;
};

const formatIndex = (index: IndexRow) => {
  const withSchemaRemoved = index.indexdef.replace(/ on public\./i, ' on ');
  const withIfNotExists = withSchemaRemoved.replace(/(create\s+(unique\s+)?index)/i, '$1 if not exists');
  return `${withIfNotExists};`;
};

const buildSchemaSnapshot = async (sql: SqlClient) => {
  const [extensions, tables, columns, constraints, indexes] = await Promise.all([
    fetchExtensions(sql),
    fetchTables(sql),
    fetchColumns(sql),
    fetchConstraints(sql),
    fetchIndexes(sql)
  ]);

  const columnsByTable = groupBy(columns, 'table_name') as Record<string, ColumnRow[]>;
  const constraintsByTable = groupBy(constraints, 'table_name') as Record<string, ConstraintRow[]>;
  const indexesByTable = groupBy(indexes, 'table_name') as Record<string, IndexRow[]>;

  const lines: string[] = [];

  if (extensions.length > 0) {
    for (const extension of extensions) {
      lines.push(`create extension if not exists "${extension.extname}";`);
    }
    lines.push('');
  }

  for (const table of tables) {
    const tableColumns = columnsByTable[table.table_name] ?? [];
    const tableConstraints = constraintsByTable[table.table_name] ?? [];
    const tableIndexes = (indexesByTable[table.table_name] ?? []).filter((index) => !index.indexname.endsWith('_pkey'));

    if (tableColumns.length === 0) {
      continue;
    }

    lines.push(`create table if not exists ${table.table_name} (`);
    const tableLines = [...tableColumns.map(formatColumn), ...tableConstraints.map(formatConstraint)];
    for (let i = 0; i < tableLines.length; i += 1) {
      const suffix = i < tableLines.length - 1 ? ',' : '';
      lines.push(`  ${tableLines[i]}${suffix}`);
    }
    lines.push(');');
    lines.push('');

    for (const index of tableIndexes) {
      lines.push(`${formatIndex(index)}`);
    }

    if (tableIndexes.length > 0) {
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd() + '\n';
};

type SnapshotOptions = {
  schemaFile?: string;
};

export const generateSchemaSnapshot = async (options: SnapshotOptions = {}) => {
  loadEnvFiles();
  assertDatabaseUrl();

  const schemaFile = options.schemaFile ?? 'db/schema.sql';
  const schemaPath = path.resolve(process.cwd(), schemaFile);
  const sql = await getSqlClient();
  const snapshot = await buildSchemaSnapshot(sql);

  await fs.writeFile(schemaPath, snapshot);
  console.log(`Schema snapshot written to ${schemaFile}`);
};

if (require.main === module) {
  generateSchemaSnapshot().catch((error) => {
    console.error('Schema snapshot generation failed:', error);
    process.exit(1);
  });
}


