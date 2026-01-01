import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const query = async <T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> => {
  const { default: sql } = await import('../lib/db');
  const result = await sql(strings, ...values);
  return result as T[];
};

const CREATED_BY = 'secularsolstice-import';

const run = async () => {
  console.log(`Deleting records created by "${CREATED_BY}" (preserving items edited by others)...\n`);

  // Step 1: Count and delete song_versions created by secularsolstice-import
  const [versionCountBefore] = await query<{ count: string }>`
    SELECT COUNT(*) as count FROM song_versions WHERE created_by = ${CREATED_BY}
  `;
  console.log(`Found ${versionCountBefore.count} song_versions created by ${CREATED_BY}`);

  const deletedVersions = await query<{ id: string }>`
    DELETE FROM song_versions WHERE created_by = ${CREATED_BY} RETURNING id
  `;
  console.log(`Deleted ${deletedVersions.length} song_versions\n`);

  // Step 2: Delete songs created by secularsolstice-import that have no remaining versions
  const songsWithNoVersions = await query<{ id: string; title: string }>`
    SELECT s.id, s.title
    FROM songs s
    WHERE s.created_by = ${CREATED_BY}
      AND NOT EXISTS (SELECT 1 FROM song_versions sv WHERE sv.song_id = s.id)
  `;
  console.log(`Found ${songsWithNoVersions.length} songs by ${CREATED_BY} with no remaining versions`);

  const deletedSongs = await query<{ id: string }>`
    DELETE FROM songs s
    WHERE s.created_by = ${CREATED_BY}
      AND NOT EXISTS (SELECT 1 FROM song_versions sv WHERE sv.song_id = s.id)
    RETURNING id
  `;
  console.log(`Deleted ${deletedSongs.length} songs\n`);

  // Step 3: Delete programs created by secularsolstice-import that have no remaining song versions
  // (checking both direct element_ids and subprogram element_ids)
  const programsToDelete = await query<{ id: string; title: string }>`
    SELECT p.id, p.title
    FROM programs p
    WHERE p.created_by = ${CREATED_BY}
      AND p.archived = false
      -- No direct song versions exist
      AND NOT EXISTS (
        SELECT 1 FROM song_versions sv
        WHERE sv.id = ANY(p.element_ids)
      )
      -- No subprograms with song versions exist
      AND NOT EXISTS (
        SELECT 1 FROM programs subp
        WHERE subp.id = ANY(p.program_ids)
          AND subp.archived = false
          AND EXISTS (
            SELECT 1 FROM song_versions sv
            WHERE sv.id = ANY(subp.element_ids)
          )
      )
  `;
  console.log(`Found ${programsToDelete.length} programs by ${CREATED_BY} with no remaining song versions`);
  if (programsToDelete.length > 0) {
    console.log('Programs to delete:');
    programsToDelete.forEach(p => console.log(`  - ${p.title}`));
  }

  const deletedPrograms = await query<{ id: string }>`
    DELETE FROM programs p
    WHERE p.created_by = ${CREATED_BY}
      AND p.archived = false
      AND NOT EXISTS (
        SELECT 1 FROM song_versions sv
        WHERE sv.id = ANY(p.element_ids)
      )
      AND NOT EXISTS (
        SELECT 1 FROM programs subp
        WHERE subp.id = ANY(p.program_ids)
          AND subp.archived = false
          AND EXISTS (
            SELECT 1 FROM song_versions sv
            WHERE sv.id = ANY(subp.element_ids)
          )
      )
    RETURNING id
  `;
  console.log(`Deleted ${deletedPrograms.length} programs\n`);

  // Step 4: Clean up stale references in users.performed_program_ids
  // Remove any program IDs that no longer exist in the programs table
  const [usersCleanedUp] = await query<{ count: string }>`
    WITH updated AS (
      UPDATE users
      SET performed_program_ids = (
        SELECT COALESCE(array_agg(pid), ARRAY[]::uuid[])
        FROM unnest(performed_program_ids) AS pid
        WHERE EXISTS (SELECT 1 FROM programs WHERE id = pid)
      )
      WHERE array_length(performed_program_ids, 1) > 0
        AND EXISTS (
          SELECT 1 FROM unnest(performed_program_ids) AS pid
          WHERE NOT EXISTS (SELECT 1 FROM programs WHERE id = pid)
        )
      RETURNING 1
    )
    SELECT COUNT(*) as count FROM updated
  `;
  if (parseInt(usersCleanedUp.count) > 0) {
    console.log(`Cleaned up stale program references from ${usersCleanedUp.count} users' performed_program_ids`);
  }

  // Step 5: Clean up orphaned subprogram references in programs.program_ids
  // Remove any subprogram IDs that no longer exist or are archived
  const [programsCleanedUp] = await query<{ count: string }>`
    WITH updated AS (
      UPDATE programs
      SET program_ids = (
        SELECT COALESCE(array_agg(pid), ARRAY[]::uuid[])
        FROM unnest(program_ids) AS pid
        WHERE EXISTS (SELECT 1 FROM programs p2 WHERE p2.id = pid AND p2.archived = false)
      )
      WHERE array_length(program_ids, 1) > 0
        AND EXISTS (
          SELECT 1 FROM unnest(program_ids) AS pid
          WHERE NOT EXISTS (SELECT 1 FROM programs p2 WHERE p2.id = pid AND p2.archived = false)
        )
      RETURNING 1
    )
    SELECT COUNT(*) as count FROM updated
  `;
  if (parseInt(programsCleanedUp.count) > 0) {
    console.log(`Cleaned up orphaned subprogram references from ${programsCleanedUp.count} programs' program_ids`);
  }

  // Summary of what remains
  const [remainingSongs] = await query<{ count: string }>`
    SELECT COUNT(*) as count FROM songs WHERE created_by = ${CREATED_BY}
  `;
  const [remainingPrograms] = await query<{ count: string }>`
    SELECT COUNT(*) as count FROM programs WHERE created_by = ${CREATED_BY} AND archived = false
  `;
  console.log(`\nRemaining items by ${CREATED_BY} (have other versions/content):`);
  console.log(`  - ${remainingSongs.count} songs`);
  console.log(`  - ${remainingPrograms.count} programs`);

  console.log('\nDone!');
  process.exit(0);
};

run().catch((error) => {
  console.error('Failed to delete records:', error);
  process.exit(1);
});
