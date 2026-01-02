import 'dotenv/config';
import sql from '../lib/db';
import { latestProgramVersionCte } from '../lib/programsRepository';

interface ProgramRow {
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
  locked: boolean;
}

(async () => {
  const rows = await sql`
    with latest_versions as (${latestProgramVersionCte()})
    select p.id, lv.title, lv.element_ids, lv.program_ids, lv.created_by, p.created_at, lv.archived, lv.is_subprogram, lv.video_url, lv.print_program_foreword, lv.print_program_epitaph, lv.locked
    from programs p
    join latest_versions lv on lv.program_id = p.id
    where lv.archived = false
    order by p.created_at desc
  ` as ProgramRow[];

  // Filter to top-level programs (same as ProgramsList component)
  const topLevelPrograms = rows.filter((p) => !p.is_subprogram && !p.archived);

  console.log(`Total programs (non-archived): ${rows.length}`);
  console.log(`Top-level programs (non-subprogram, non-archived): ${topLevelPrograms.length}\n`);

  topLevelPrograms.forEach((program, idx) => {
    console.log(`${idx + 1}. ${program.title}`);
    console.log(`   ID: ${program.id}`);
    console.log(`   Created: ${new Date(program.created_at).toISOString()}`);
    if (program.created_by) {
      console.log(`   Created by: ${program.created_by}`);
    } else {
      console.log(`   Created by: (null)`);
    }
    console.log(`   Element IDs (${program.element_ids?.length || 0}): ${program.element_ids?.join(', ') || 'none'}`);
    console.log(`   Subprogram IDs (${program.program_ids?.length || 0}): ${program.program_ids?.join(', ') || 'none'}`);
    if (program.video_url) {
      console.log(`   Video URL: ${program.video_url}`);
    }
    if (program.print_program_foreword) {
      console.log(`   Print Foreword: ${program.print_program_foreword.substring(0, 50)}...`);
    }
    if (program.print_program_epitaph) {
      console.log(`   Print Epitaph: ${program.print_program_epitaph.substring(0, 50)}...`);
    }
    console.log(`   Locked: ${program.locked}`);
    console.log('');
  });

  console.log(`\n--- Summary ---`);
  console.log(`Total top-level programs: ${topLevelPrograms.length}`);
  console.log(`Programs with elements: ${topLevelPrograms.filter(p => (p.element_ids?.length || 0) > 0).length}`);
  console.log(`Programs with subprograms: ${topLevelPrograms.filter(p => (p.program_ids?.length || 0) > 0).length}`);
  console.log(`Programs with video URLs: ${topLevelPrograms.filter(p => p.video_url).length}`);
  console.log(`Locked programs: ${topLevelPrograms.filter(p => p.locked).length}`);

  process.exit(0);
})();
