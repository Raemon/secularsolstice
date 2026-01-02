import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const query = async <T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> => {
  const { default: sql } = await import('../lib/db');
  const result = await sql(strings, ...values);
  return result as T[];
};

type Vote = { id: string; version_id: string };
type Program = { id: string; element_ids: string[] };

const run = async () => {
  // Get all votes that don't have a program_id yet
  const votes = await query<Vote>`
    SELECT id, version_id FROM votes WHERE program_id IS NULL
  `;
  console.log(`Found ${votes.length} votes without program_id`);

  // Get all programs with their element_ids from latest versions
  const programs = await query<Program>`
    WITH latest_versions AS (
      SELECT DISTINCT ON (program_id) *
      FROM program_versions
      ORDER BY program_id, created_at DESC
    )
    SELECT p.id, lv.element_ids FROM programs p
    JOIN latest_versions lv ON lv.program_id = p.id
  `;
  console.log(`Found ${programs.length} programs`);

  // Build a map of version_id -> program_ids that contain it
  const versionToProgramIds: Record<string, string[]> = {};
  for (const program of programs) {
    for (const elementId of program.element_ids || []) {
      if (!versionToProgramIds[elementId]) {
        versionToProgramIds[elementId] = [];
      }
      versionToProgramIds[elementId].push(program.id);
    }
  }

  let updatedCount = 0;
  let skippedMultiple = 0;
  let skippedNone = 0;

  for (const vote of votes) {
    const programIds = versionToProgramIds[vote.version_id] || [];
    if (programIds.length === 1) {
      await query`UPDATE votes SET program_id = ${programIds[0]} WHERE id = ${vote.id}`;
      updatedCount++;
    } else if (programIds.length === 0) {
      skippedNone++;
    } else {
      skippedMultiple++;
    }
  }

  console.log(`\nResults:`);
  console.log(`  Updated: ${updatedCount} votes (version in exactly 1 program)`);
  console.log(`  Skipped (no program): ${skippedNone} votes`);
  console.log(`  Skipped (multiple programs): ${skippedMultiple} votes`);
};

run().catch((error) => {
  console.error('Failed to backfill vote program IDs:', error);
  process.exit(1);
});
