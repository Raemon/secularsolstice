import 'dotenv/config';
import sql from '../lib/db';

interface ProgramVersion {
  id: string;
  program_id: string;
  title: string;
  created_at: Date;
  created_by: string | null;
}

(async () => {
  // Get the latest version of each program where created_by is null
  const rows = await sql`
    WITH latest_versions AS (
      SELECT DISTINCT ON (program_id) *
      FROM program_versions
      ORDER BY program_id, created_at DESC
    )
    SELECT 
      lv.id,
      lv.program_id,
      lv.title,
      lv.created_at,
      lv.created_by
    FROM latest_versions lv
    WHERE lv.created_by IS NULL
    ORDER BY lv.created_at ASC
  ` as ProgramVersion[];
  
  console.log(`Total programs with null created_by (latest version): ${rows.length}`);
  
  if (rows.length === 0) {
    console.log('No anonymous programs found.');
    process.exit(0);
  }

  // Find programs created within 5 minutes of each other
  const fiveMinutesMs = 5 * 60 * 1000;
  const clusters: ProgramVersion[][] = [];
  let currentCluster: ProgramVersion[] = [rows[0]];

  for (let i = 1; i < rows.length; i++) {
    const prevTime = new Date(rows[i - 1].created_at).getTime();
    const currTime = new Date(rows[i].created_at).getTime();
    const diff = currTime - prevTime;
    
    if (diff <= fiveMinutesMs) {
      currentCluster.push(rows[i]);
    } else {
      if (currentCluster.length > 1) {
        clusters.push(currentCluster);
      }
      currentCluster = [rows[i]];
    }
  }
  // Don't forget the last cluster
  if (currentCluster.length > 1) {
    clusters.push(currentCluster);
  }

  console.log(`\nClusters of programs created within 5 minutes of each other: ${clusters.length}`);
  
  let totalInClusters = 0;
  clusters.forEach((cluster, idx) => {
    totalInClusters += cluster.length;
    const startTime = new Date(cluster[0].created_at);
    const endTime = new Date(cluster[cluster.length - 1].created_at);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMin = (durationMs / 1000 / 60).toFixed(1);
    
    console.log(`\nCluster ${idx + 1}: ${cluster.length} programs over ${durationMin} minutes`);
    console.log(`  Start: ${startTime.toISOString()}`);
    console.log(`  End:   ${endTime.toISOString()}`);
    console.log(`  Programs:`);
    cluster.forEach(p => {
      console.log(`    - ${p.title}`);
    });
  });

  console.log(`\n--- Summary ---`);
  console.log(`Total anonymous programs: ${rows.length}`);
  console.log(`Programs in clusters (within 5min of each other): ${totalInClusters}`);
  console.log(`Standalone programs: ${rows.length - totalInClusters}`);
  console.log(`Number of clusters: ${clusters.length}`);

  process.exit(0);
})();
