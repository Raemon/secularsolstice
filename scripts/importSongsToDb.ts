import path from 'path';
import { downloadSecularSolsticeRepo, DEFAULT_DOWNLOAD_DIR } from '../lib/githubDownloader';

const run = async () => {
  const args = process.argv.slice(2);
  const downloadOnly = args.includes('--download-only');
  const useCache = args.includes('--use-cache');
  const forceDownload = args.includes('--force-download');

  console.log('Starting import...');
  console.log('Downloading SecularSolstice repo from GitHub...');

  const repo = await downloadSecularSolsticeRepo({
    persistentDir: (downloadOnly || useCache) ? DEFAULT_DOWNLOAD_DIR : undefined,
    skipIfExists: useCache && !forceDownload,
    onProgress: (progress) => {
      if (progress.phase === 'cloning') {
        console.log('Cloning repository...');
      } else if (progress.phase === 'pulling') {
        console.log('Pulling latest changes...');
      } else if (progress.phase === 'done') {
        console.log('Repository ready.');
      }
    },
  });
  console.log('Downloaded to:', repo.basePath);

  if (downloadOnly) {
    console.log('\n--download-only flag set, skipping import.');
    console.log('Files are available at:', repo.basePath);
    return;
  }

  // Only load DB-dependent modules when we actually need to import
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const { importFromDirectories, setFileCreatedAtFn } = await import('../lib/importUtils');
  type ProgramImportResult = Awaited<ReturnType<typeof importFromDirectories>>['programResults'][number];

  // Use git-based timestamps for files from the cloned repo
  setFileCreatedAtFn(repo.getFileCommitDate);

  const config = {
    songsDirs: [{ path: repo.songsDir, tags: ['song'] }],
    speechesDirs: [repo.speechesDir],
    programsDirs: [repo.listsDir],
    activitiesConfig: { listFile: repo.activitiesListFile, speechesDir: repo.speechesDir },
  };

  const { songResults, speechResults, activityResults, programResults, resyncResults } = await importFromDirectories(
    config,
    false, // not a dry run
    (type, result) => {
      const statusIcon = result.status === 'created' || result.status === 'created-binary' || result.status === 'resynced' ? '✓'
        : result.status === 'exists' ? '='
        : result.status === 'failed' ? '✗'
        : '?';
      if (type === 'program' || type === 'resync') {
        // @ts-ignore - ProgramImportResult is compatible
        const pr = result as ProgramImportResult;
        const extra = pr.missingElements?.length ? ` (missing: ${pr.missingElements.join(', ')})` : '';
        console.log(`  ${statusIcon} [${type}] ${pr.title} - ${pr.status}${pr.elementCount ? ` (${pr.elementCount} elements)` : ''}${extra}${pr.error ? ` (${pr.error})` : ''}`);
      } else {
        console.log(`  ${statusIcon} [${type}] ${result.title} / ${'label' in result ? result.label : ''} - ${result.status}${result.error ? ` (${result.error})` : ''}`);
      }
    }
  );

  console.log('\n=== Import Summary ===');
  console.log(`Songs: ${songResults.length} files processed`);
  console.log(`  Created: ${songResults.filter(r => r.status === 'created' || r.status === 'created-binary').length}`);
  console.log(`  Existed: ${songResults.filter(r => r.status === 'exists').length}`);
  console.log(`  Failed: ${songResults.filter(r => r.status === 'failed').length}`);
  console.log(`Speeches: ${speechResults.length} files processed`);
  console.log(`  Created: ${speechResults.filter(r => r.status === 'created').length}`);
  console.log(`  Existed: ${speechResults.filter(r => r.status === 'exists').length}`);
  console.log(`  Failed: ${speechResults.filter(r => r.status === 'failed').length}`);
  console.log(`Activities: ${activityResults.length} files processed`);
  console.log(`  Created: ${activityResults.filter(r => r.status === 'created').length}`);
  console.log(`  Existed: ${activityResults.filter(r => r.status === 'exists').length}`);
  console.log(`  Failed: ${activityResults.filter(r => r.status === 'failed').length}`);
  console.log(`Programs: ${programResults.length} files processed`);
  console.log(`  Created: ${programResults.filter(r => r.status === 'created').length}`);
  console.log(`  Existed: ${programResults.filter(r => r.status === 'exists').length}`);
  console.log(`  Failed: ${programResults.filter(r => r.status === 'failed').length}`);
  console.log(`Resynced: ${resyncResults.length} programs`);
  console.log(`  Resynced: ${resyncResults.filter(r => r.status === 'resynced').length}`);
  console.log(`  Failed: ${resyncResults.filter(r => r.status === 'failed').length}`);

  console.log('\nCleaning up temporary files...');
  await repo.cleanup();
  console.log('Done!');
};

run().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});