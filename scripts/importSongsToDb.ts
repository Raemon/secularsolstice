import path from 'path';
import dotenv from 'dotenv';
import { importFromDirectories, ProgramImportResult } from '../lib/importUtils';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SONGS_DIR = path.join(process.cwd(), 'songs');
const SECULAR_ROOT = path.join(process.cwd(), 'SecularSolstice.github.io-master');

const run = async () => {
  const config = {
    songsDirs: [
      { path: SONGS_DIR, tags: ['song'] },
      { path: path.join(SECULAR_ROOT, 'songs'), tags: ['song', 'secular-solstice'] },
    ],
    speechesDirs: [path.join(SECULAR_ROOT, 'speeches')],
    programsDirs: [path.join(SECULAR_ROOT, 'lists')],
  };

  console.log('Starting import...');
  console.log('Songs directories:', config.songsDirs.map(d => d.path));
  console.log('Speeches directories:', config.speechesDirs);
  console.log('Programs directories:', config.programsDirs);

  const { songResults, speechResults, programResults } = await importFromDirectories(
    config,
    false, // not a dry run
    (type, result) => {
      const statusIcon = result.status === 'created' || result.status === 'created-binary' ? '✓'
        : result.status === 'exists' ? '='
        : result.status === 'failed' ? '✗'
        : '?';
      if (type === 'program') {
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
  console.log(`Programs: ${programResults.length} files processed`);
  console.log(`  Created: ${programResults.filter(r => r.status === 'created').length}`);
  console.log(`  Existed: ${programResults.filter(r => r.status === 'exists').length}`);
  console.log(`  Failed: ${programResults.filter(r => r.status === 'failed').length}`);
};

run().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});