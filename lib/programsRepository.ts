import sql from './db';

type ProgramRow = {
  id: string;
  title: string;
  element_ids: string[] | null;
  created_at: string;
};

export type ProgramRecord = {
  id: string;
  title: string;
  elementIds: string[];
  createdAt: string;
};

const mapProgramRow = (row: ProgramRow): ProgramRecord => ({
  id: row.id,
  title: row.title,
  elementIds: row.element_ids ?? [],
  createdAt: row.created_at,
});

export const listPrograms = async (): Promise<ProgramRecord[]> => {
  const rows = await sql`
    select id, title, element_ids, created_at
    from programs
    order by created_at asc
  `;
  return (rows as ProgramRow[]).map(mapProgramRow);
};

export const createProgram = async (title: string): Promise<ProgramRecord> => {
  const rows = await sql`
    insert into programs (title)
    values (${title})
    returning id, title, element_ids, created_at
  `;
  return mapProgramRow((rows as ProgramRow[])[0]!);
};

export const getProgramById = async (programId: string): Promise<ProgramRecord | null> => {
  const rows = await sql`
    select id, title, element_ids, created_at
    from programs
    where id = ${programId}
  `;
  const typedRows = rows as ProgramRow[];
  if (typedRows.length === 0) {
    return null;
  }
  return mapProgramRow(typedRows[0]);
};

export const updateProgramElementIds = async (programId: string, elementIds: string[]): Promise<ProgramRecord> => {
  const rows = await sql`
    update programs
    set element_ids = ${elementIds}
    where id = ${programId}
    returning id, title, element_ids, created_at
  `;
  const typedRows = rows as ProgramRow[];
  if (typedRows.length === 0) {
    throw new Error(`Program ${programId} not found`);
  }
  return mapProgramRow(typedRows[0]);
};


