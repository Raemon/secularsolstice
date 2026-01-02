import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const query = async <T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> => {
  const { default: sql } = await import('../lib/db');
  const result = await sql(strings, ...values);
  return result as T[];
};

const CREATED_BY = 'secularsolstice-import';

// Cluster 1: Bulk import on Nov 23, 2025 - 290 versions created in ~1 minute with null created_by
const CLUSTER1_START = '2025-11-23T22:23:33.163Z';
const CLUSTER1_END = '2025-11-23T22:24:24.986Z';

// Song ID to preserve (exclude from deletion logic)
const PRESERVE_SONG_ID = '18554efd-f62b-4498-8c38-66b054c20ca9';

const run = async () => {
  console.log(`Deleting records created by "${CREATED_BY}" and anonymous bulk import (preserving items edited by others)...\n`);

  // Step 1a: Count and delete song_versions created by secularsolstice-import
  const [versionCountBefore] = await query<{ count: string }>`
    SELECT COUNT(*) as count FROM song_versions WHERE created_by = ${CREATED_BY}
  `;
  console.log(`Found ${versionCountBefore.count} song_versions created by ${CREATED_BY}`);

  const deletedVersions = await query<{ id: string }>`
    DELETE FROM song_versions WHERE created_by = ${CREATED_BY} RETURNING id
  `;
  console.log(`Deleted ${deletedVersions.length} song_versions`);

  // Step 1b: Delete anonymous bulk import versions (Cluster 1)
  const [anonVersionCountBefore] = await query<{ count: string }>`
    SELECT COUNT(*) as count FROM song_versions
    WHERE created_by IS NULL
      AND db_created_at >= ${CLUSTER1_START}::timestamptz
      AND db_created_at <= ${CLUSTER1_END}::timestamptz
  `;
  console.log(`Found ${anonVersionCountBefore.count} anonymous bulk import song_versions`);

  const deletedAnonVersions = await query<{ id: string }>`
    DELETE FROM song_versions
    WHERE created_by IS NULL
      AND db_created_at >= ${CLUSTER1_START}::timestamptz
      AND db_created_at <= ${CLUSTER1_END}::timestamptz
    RETURNING id
  `;
  console.log(`Deleted ${deletedAnonVersions.length} anonymous bulk import song_versions\n`);

  // Step 2a: Delete songs created by secularsolstice-import that have no remaining versions
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
  console.log(`Deleted ${deletedSongs.length} songs`);

  // Step 2b: Delete songs with created_by = NULL that have no versions OR were created during Cluster 1 time period
  // (these are songs from the anonymous bulk import that have no remaining versions,
  // or only have versions created by the import or Cluster 1)
  
  // First, delete songs with no versions (orphaned songs)
  const anonSongsWithNoVersions = await query<{ id: string; title: string }>`
    SELECT s.id, s.title
    FROM songs s
    WHERE s.created_by IS NULL
      AND NOT EXISTS (SELECT 1 FROM song_versions sv WHERE sv.song_id = s.id)
  `;
  console.log(`Found ${anonSongsWithNoVersions.length} songs with NULL created_by and no versions (orphaned songs)`);

  const deletedAnonSongsNoVersions = await query<{ id: string }>`
    DELETE FROM songs s
    WHERE s.created_by IS NULL
      AND NOT EXISTS (SELECT 1 FROM song_versions sv WHERE sv.song_id = s.id)
    RETURNING id
  `;
  console.log(`Deleted ${deletedAnonSongsNoVersions.length} orphaned songs with no versions\n`);

  // Then, delete songs created during Cluster 1 that only have versions from import/Cluster 1
  const anonSongsInCluster1 = await query<{ id: string; title: string }>`
    SELECT s.id, s.title
    FROM songs s
    WHERE s.created_by IS NULL
      AND s.created_at >= ${CLUSTER1_START}::timestamptz
      AND s.created_at <= ${CLUSTER1_END}::timestamptz
      AND EXISTS (SELECT 1 FROM song_versions sv WHERE sv.song_id = s.id)
      AND NOT EXISTS (
        SELECT 1 FROM song_versions sv
        WHERE sv.song_id = s.id
          AND sv.created_by IS DISTINCT FROM ${CREATED_BY}
          AND NOT (sv.created_by IS NULL
            AND sv.db_created_at >= ${CLUSTER1_START}::timestamptz
            AND sv.db_created_at <= ${CLUSTER1_END}::timestamptz)
      )
  `;
  console.log(`Found ${anonSongsInCluster1.length} songs with NULL created_by from Cluster 1 with only import/Cluster 1 versions`);

  const deletedAnonSongsInCluster1 = await query<{ id: string }>`
    DELETE FROM songs s
    WHERE s.created_by IS NULL
      AND s.created_at >= ${CLUSTER1_START}::timestamptz
      AND s.created_at <= ${CLUSTER1_END}::timestamptz
      AND EXISTS (SELECT 1 FROM song_versions sv WHERE sv.song_id = s.id)
      AND NOT EXISTS (
        SELECT 1 FROM song_versions sv
        WHERE sv.song_id = s.id
          AND sv.created_by IS DISTINCT FROM ${CREATED_BY}
          AND NOT (sv.created_by IS NULL
            AND sv.db_created_at >= ${CLUSTER1_START}::timestamptz
            AND sv.db_created_at <= ${CLUSTER1_END}::timestamptz)
      )
    RETURNING id
  `;
  console.log(`Deleted ${deletedAnonSongsInCluster1.length} anonymous bulk import songs from Cluster 1\n`);

  // Step 3: Delete programs created by secularsolstice-import or with NULL created_by in Cluster 1
  const programsToDelete = await query<{ id: string; title: string }>`
    WITH latest_versions AS (
      SELECT DISTINCT ON (program_id) program_id, created_by, created_at, archived, title
      FROM program_versions
      ORDER BY program_id, created_at DESC
    )
    SELECT p.id, lv.title
    FROM programs p
    JOIN latest_versions lv ON lv.program_id = p.id
    WHERE lv.archived = false
      AND (
        lv.created_by = ${CREATED_BY}
        OR (lv.created_by IS NULL
          AND lv.created_at >= ${CLUSTER1_START}::timestamptz
          AND lv.created_at <= ${CLUSTER1_END}::timestamptz)
      )
  `;
  console.log(`Found ${programsToDelete.length} programs by ${CREATED_BY} or NULL created_by in Cluster 1`);
  if (programsToDelete.length > 0) {
    console.log('Programs to delete:');
    programsToDelete.forEach(p => console.log(`  - ${p.title}`));
  }

  const deletedPrograms = await query<{ id: string }>`
    WITH latest_versions AS (
      SELECT DISTINCT ON (program_id) program_id, created_by, created_at, archived
      FROM program_versions
      ORDER BY program_id, created_at DESC
    )
    DELETE FROM programs p
    WHERE EXISTS (
      SELECT 1 FROM latest_versions lv
      WHERE lv.program_id = p.id
        AND lv.archived = false
        AND (
          lv.created_by = ${CREATED_BY}
          OR (lv.created_by IS NULL
            AND lv.created_at >= ${CLUSTER1_START}::timestamptz
            AND lv.created_at <= ${CLUSTER1_END}::timestamptz)
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

  // Step 5: Clean up orphaned subprogram references in program_versions.program_ids
  // Remove any subprogram IDs that no longer exist or are archived (in their latest version)
  const [programsCleanedUp] = await query<{ count: string }>`
    WITH latest_versions AS (
      SELECT DISTINCT ON (program_id) *
      FROM program_versions
      ORDER BY program_id, created_at DESC
    ),
    updated AS (
      UPDATE program_versions pv
      SET program_ids = (
        SELECT COALESCE(array_agg(pid), ARRAY[]::uuid[])
        FROM unnest(pv.program_ids) AS pid
        WHERE EXISTS (SELECT 1 FROM latest_versions lv2 WHERE lv2.program_id = pid AND lv2.archived = false)
      )
      WHERE pv.id IN (SELECT id FROM latest_versions)
        AND array_length(pv.program_ids, 1) > 0
        AND EXISTS (
          SELECT 1 FROM unnest(pv.program_ids) AS pid
          WHERE NOT EXISTS (SELECT 1 FROM latest_versions lv2 WHERE lv2.program_id = pid AND lv2.archived = false)
        )
      RETURNING 1
    )
    SELECT COUNT(*) as count FROM updated
  `;
  if (parseInt(programsCleanedUp.count) > 0) {
    console.log(`Cleaned up orphaned subprogram references from ${programsCleanedUp.count} program versions' program_ids`);
  }

  // Summary of what remains
  const [remainingSongs] = await query<{ count: string }>`
    SELECT COUNT(*) as count FROM songs WHERE created_by = ${CREATED_BY}
  `;
  const [remainingPrograms] = await query<{ count: string }>`
    WITH latest_versions AS (
      SELECT DISTINCT ON (program_id) program_id, created_by, created_at, archived
      FROM program_versions
      ORDER BY program_id, created_at DESC
    )
    SELECT COUNT(*) as count FROM programs p
    JOIN latest_versions lv ON lv.program_id = p.id
    WHERE lv.archived = false
      AND (
        lv.created_by = ${CREATED_BY}
        OR (lv.created_by IS NULL
          AND lv.created_at >= ${CLUSTER1_START}::timestamptz
          AND lv.created_at <= ${CLUSTER1_END}::timestamptz)
      )
  `;
  console.log(`\nRemaining items by ${CREATED_BY} or NULL created_by in Cluster 1:`);
  console.log(`  - ${remainingSongs.count} songs`);
  console.log(`  - ${remainingPrograms.count} programs`);

  console.log('\nDone!');
  process.exit(0);
};

run().catch((error) => {
  console.error('Failed to delete records:', error);
  process.exit(1);
});
