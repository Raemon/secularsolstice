import 'dotenv/config';
import sql from '../lib/db';

interface SongRow {
  id: string;
  title: string;
  created_by: string | null;
  created_at: string;
}

interface SongVersionRow {
  id: string;
  song_id: string;
  label: string;
  created_by: string | null;
  created_at: string;
  db_created_at: string;
  song_title: string;
}

(async () => {
  // Query all songs
  const songs = await sql`
    SELECT id, title, created_by, created_at
    FROM songs
    ORDER BY created_at DESC
  ` as SongRow[];

  // Query all song versions
  const songVersions = await sql`
    SELECT 
      sv.id,
      sv.song_id,
      sv.label,
      sv.created_by,
      sv.created_at,
      sv.db_created_at,
      s.title as song_title
    FROM song_versions sv
    JOIN songs s ON sv.song_id = s.id
    ORDER BY sv.created_at DESC
  ` as SongVersionRow[];

  console.log('=== SONGS ===\n');
  console.log(`Total songs: ${songs.length}\n`);
  
  songs.forEach((song, idx) => {
    console.log(`${idx + 1}. ${song.title}`);
    console.log(`   ID: ${song.id}`);
    console.log(`   Created: ${new Date(song.created_at).toISOString()}`);
    if (song.created_by) {
      console.log(`   Created by: ${song.created_by}`);
    } else {
      console.log(`   Created by: (null)`);
    }
    console.log('');
  });

  console.log('\n=== SONG VERSIONS ===\n');
  console.log(`Total song versions: ${songVersions.length}\n`);
  
  songVersions.forEach((version, idx) => {
    console.log(`${idx + 1}. ${version.song_title} (${version.label})`);
    console.log(`   Version ID: ${version.id}`);
    console.log(`   Song ID: ${version.song_id}`);
    console.log(`   Created: ${new Date(version.created_at).toISOString()}`);
    console.log(`   DB Created: ${new Date(version.db_created_at).toISOString()}`);
    if (version.created_by) {
      console.log(`   Created by: ${version.created_by}`);
    } else {
      console.log(`   Created by: (null)`);
    }
    console.log('');
  });

  // Find Cluster 1 period from null song versions using db_created_at
  const nullVersions = songVersions
    .filter(v => v.created_by === null)
    .sort((a, b) => new Date(a.db_created_at).getTime() - new Date(b.db_created_at).getTime());

  let cluster1Start: Date | null = null;
  let cluster1End: Date | null = null;
  let clusters: SongVersionRow[][] = [];

  if (nullVersions.length > 0) {
    const fiveMinutesMs = 5 * 60 * 1000;
    let currentCluster: SongVersionRow[] = [nullVersions[0]];

    for (let i = 1; i < nullVersions.length; i++) {
      const prevTime = new Date(nullVersions[i - 1].db_created_at).getTime();
      const currTime = new Date(nullVersions[i].db_created_at).getTime();
      const diff = currTime - prevTime;

      if (diff <= fiveMinutesMs) {
        currentCluster.push(nullVersions[i]);
      } else {
        if (currentCluster.length > 1) {
          clusters.push(currentCluster);
        }
        currentCluster = [nullVersions[i]];
      }
    }
    // Don't forget the last cluster
    if (currentCluster.length > 1) {
      clusters.push(currentCluster);
    }

    // Get Cluster 1 period
    if (clusters.length > 0) {
      cluster1Start = new Date(clusters[0][0].db_created_at);
      cluster1End = new Date(clusters[0][clusters[0].length - 1].db_created_at);
    }
  }

  // Display clusters
  console.log('\n=== CLUSTERS OF NULL SONG VERSIONS (by db_created_at) ===\n');
  console.log(`Total null song versions: ${nullVersions.length}`);
  console.log(`Clusters of versions created within 5 minutes of each other: ${clusters.length}\n`);

  let totalInClusters = 0;
  clusters.forEach((cluster, idx) => {
    totalInClusters += cluster.length;
    const startTime = new Date(cluster[0].db_created_at);
    const endTime = new Date(cluster[cluster.length - 1].db_created_at);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMin = (durationMs / 1000 / 60).toFixed(1);

    console.log(`Cluster ${idx + 1}: ${cluster.length} versions over ${durationMin} minutes`);
    console.log(`  Start: ${startTime.toISOString()}`);
    console.log(`  End:   ${endTime.toISOString()}`);
    console.log(`  Versions:`);
    cluster.forEach(version => {
      console.log(`    - ${version.song_title} (${version.label})`);
    });
    console.log('');
  });

  if (clusters.length === 0) {
    console.log('No clusters found (all null versions are standalone).\n');
  }

  // Count songs by criteria
  let songsNullInCluster1 = 0;
  let songsNullOutsideCluster1 = 0;
  let songsSecularSolsticeImport = 0;

  songs.forEach(song => {
    const songCreatedAt = new Date(song.created_at).getTime();
    
    if (song.created_by === null) {
      if (cluster1Start && cluster1End) {
        const cluster1StartTime = cluster1Start.getTime();
        const cluster1EndTime = cluster1End.getTime();
        if (songCreatedAt >= cluster1StartTime && songCreatedAt <= cluster1EndTime) {
          songsNullInCluster1++;
        } else {
          songsNullOutsideCluster1++;
        }
      } else {
        songsNullOutsideCluster1++;
      }
    } else if (song.created_by === 'secularsolstice-import') {
      songsSecularSolsticeImport++;
    }
  });

  console.log('\n--- Summary ---');
  console.log(`Total songs: ${songs.length}`);
  console.log(`Total song versions: ${songVersions.length}`);
  console.log(`Songs with created_by: ${songs.filter(s => s.created_by).length}`);
  console.log(`Song versions with created_by: ${songVersions.filter(v => v.created_by).length}`);
  const nullSongs = songs.filter(s => s.created_by === null);
  console.log(`\nNull songs: ${nullSongs.length}`);
  console.log(`Null song versions in clusters (within 5min of each other): ${totalInClusters}`);
  console.log(`Standalone null song versions: ${nullVersions.length - totalInClusters}`);
  console.log(`Number of clusters: ${clusters.length}`);
  console.log(`\nSongs created by "null" within Cluster 1 period: ${songsNullInCluster1}`);
  console.log(`Songs created by "null" outside Cluster 1 period: ${songsNullOutsideCluster1}`);
  console.log(`Songs created by "secularsolstice-import": ${songsSecularSolsticeImport}`);

  process.exit(0);
})();
