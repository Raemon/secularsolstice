import 'dotenv/config';
import sql from '../lib/db';

interface SongVersion {
  id: string;
  song_id: string;
  label: string;
  created_at: Date;
  created_by: string;
  song_title: string;
}

(async () => {
  const rows = await sql`
    SELECT 
      sv.id,
      sv.song_id,
      sv.label,
      sv.created_at,
      sv.created_by,
      s.title as song_title
    FROM song_versions sv
    JOIN songs s ON sv.song_id = s.id
    WHERE sv.created_by IS NULL
    ORDER BY sv.created_at ASC
  ` as SongVersion[];
  
  console.log(`Total anonymous song_versions: ${rows.length}`);
  
  if (rows.length === 0) {
    console.log('No anonymous song versions found.');
    process.exit(0);
  }

  // Find versions created within 5 minutes of each other
  const fiveMinutesMs = 5 * 60 * 1000;
  const clusters: SongVersion[][] = [];
  let currentCluster: SongVersion[] = [rows[0]];

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

  console.log(`\nClusters of versions created within 5 minutes of each other: ${clusters.length}`);
  
  let totalInClusters = 0;
  clusters.forEach((cluster, idx) => {
    totalInClusters += cluster.length;
    const startTime = new Date(cluster[0].created_at);
    const endTime = new Date(cluster[cluster.length - 1].created_at);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMin = (durationMs / 1000 / 60).toFixed(1);
    
    console.log(`\nCluster ${idx + 1}: ${cluster.length} versions over ${durationMin} minutes`);
    console.log(`  Start: ${startTime.toISOString()}`);
    console.log(`  End:   ${endTime.toISOString()}`);
    console.log(`  Songs:`);
    cluster.forEach(v => {
      console.log(`    - ${v.song_title} (${v.label})`);
    });
  });

  console.log(`\n--- Summary ---`);
  console.log(`Total anonymous versions: ${rows.length}`);
  console.log(`Versions in clusters (within 5min of each other): ${totalInClusters}`);
  console.log(`Standalone versions: ${rows.length - totalInClusters}`);
  console.log(`Number of clusters: ${clusters.length}`);

  process.exit(0);
})();
