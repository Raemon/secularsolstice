import sql from './db';

type ProgramRow = {
  id: string;
  title: string;
  element_ids: string[] | null;
  program_ids: string[] | null;
  created_by: string | null;
  created_at: string;
  archived: boolean;
  is_subprogram: boolean;
  video_url: string | null;
  print_program_foreword: string | null;
  print_program_epitaph: string | null;
};

export type ProgramRecord = {
  id: string;
  title: string;
  elementIds: string[];
  programIds: string[];
  createdBy: string | null;
  createdAt: string;
  archived: boolean;
  isSubprogram: boolean;
  videoUrl: string | null;
  printProgramForeword: string | null;
  printProgramEpitaph: string | null;
};

const mapProgramRow = (row: ProgramRow): ProgramRecord => ({
  id: row.id,
  title: row.title,
  elementIds: row.element_ids ?? [],
  programIds: row.program_ids ?? [],
  createdBy: row.created_by,
  createdAt: row.created_at,
  archived: row.archived,
  isSubprogram: row.is_subprogram,
  videoUrl: row.video_url,
  printProgramForeword: row.print_program_foreword,
  printProgramEpitaph: row.print_program_epitaph,
});

export const listPrograms = async (): Promise<ProgramRecord[]> => {
  const rows = await sql`
    select id, title, element_ids, program_ids, created_by, created_at, archived, is_subprogram, video_url, print_program_foreword, print_program_epitaph
    from programs
    where archived = false
    order by created_at asc
  `;
  return (rows as ProgramRow[]).map(mapProgramRow);
};

export const createProgram = async (title: string, createdBy?: string | null, isSubprogram?: boolean): Promise<ProgramRecord> => {
  const rows = await sql`
    insert into programs (title, created_by, is_subprogram)
    values (${title}, ${createdBy ?? null}, ${isSubprogram ?? false})
    returning id, title, element_ids, program_ids, created_by, created_at, archived, is_subprogram, video_url, print_program_foreword, print_program_epitaph
  `;
  return mapProgramRow((rows as ProgramRow[])[0]!);
};

export const getProgramById = async (programId: string): Promise<ProgramRecord | null> => {
  const rows = await sql`
    select id, title, element_ids, program_ids, created_by, created_at, archived, is_subprogram, video_url, print_program_foreword, print_program_epitaph
    from programs
    where id = ${programId} and archived = false
  `;
  const typedRows = rows as ProgramRow[];
  if (typedRows.length === 0) {
    return null;
  }
  return mapProgramRow(typedRows[0]);
};

export const updateProgramElementIds = async (programId: string, elementIds: string[], programIds: string[]): Promise<ProgramRecord> => {
  const rows = await sql`
    update programs
    set element_ids = ${elementIds},
        program_ids = ${programIds}
    where id = ${programId} and archived = false
    returning id, title, element_ids, program_ids, created_by, created_at, archived, is_subprogram, video_url, print_program_foreword, print_program_epitaph
  `;
  const typedRows = rows as ProgramRow[];
  if (typedRows.length === 0) {
    throw new Error(`Program ${programId} not found or archived`);
  }
  return mapProgramRow(typedRows[0]);
};

export const archiveProgram = async (programId: string): Promise<ProgramRecord> => {
  const rows = await sql`
    update programs
    set archived = true
    where id = ${programId} and archived = false
    returning id, title, element_ids, program_ids, created_by, created_at, archived, is_subprogram, video_url, print_program_foreword, print_program_epitaph
  `;
  const typedRows = rows as ProgramRow[];
  if (typedRows.length === 0) {
    throw new Error(`Program ${programId} not found or already archived`);
  }
  return mapProgramRow(typedRows[0]);
};

export const updateProgramVideoUrl = async (programId: string, videoUrl: string): Promise<ProgramRecord> => {
  const rows = await sql`
    update programs
    set video_url = ${videoUrl}
    where id = ${programId} and archived = false
    returning id, title, element_ids, program_ids, created_by, created_at, archived, is_subprogram, video_url, print_program_foreword, print_program_epitaph
  `;
  const typedRows = rows as ProgramRow[];
  if (typedRows.length === 0) {
    throw new Error(`Program ${programId} not found or archived`);
  }
  return mapProgramRow(typedRows[0]);
};

export const updateProgram = async (programId: string, updates: {title?: string; printProgramForeword?: string | null; printProgramEpitaph?: string | null; videoUrl?: string | null; isSubprogram?: boolean}): Promise<ProgramRecord> => {
  const program = await getProgramById(programId);
  if (!program) {
    throw new Error(`Program ${programId} not found or archived`);
  }
  const rows = await sql`
    update programs
    set title = ${updates.title ?? program.title},
        print_program_foreword = ${updates.printProgramForeword !== undefined ? updates.printProgramForeword : program.printProgramForeword},
        print_program_epitaph = ${updates.printProgramEpitaph !== undefined ? updates.printProgramEpitaph : program.printProgramEpitaph},
        video_url = ${updates.videoUrl !== undefined ? updates.videoUrl : program.videoUrl},
        is_subprogram = ${updates.isSubprogram !== undefined ? updates.isSubprogram : program.isSubprogram}
    where id = ${programId} and archived = false
    returning id, title, element_ids, program_ids, created_by, created_at, archived, is_subprogram, video_url, print_program_foreword, print_program_epitaph
  `;
  const typedRows = rows as ProgramRow[];
  if (typedRows.length === 0) {
    throw new Error(`Program ${programId} not found or archived`);
  }
  return mapProgramRow(typedRows[0]);
};

















