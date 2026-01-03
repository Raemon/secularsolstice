import React from 'react';
import Link from 'next/link';
import sql from '@/lib/db';
import { getProgramById, latestProgramVersionCte } from '@/lib/programsRepository';
import { CHORDMARK_STYLES } from '@/app/chordmark-converter/chordmarkStyles';
import { TableOfContents } from './TableOfContents';
import { ScrollHandler } from './ScrollHandler';
import VersionContent from '@/app/songs/VersionContent';
import type { SongVersion } from '@/app/songs/types';

type Program = {
  id: string;
  title: string;
  elementIds: string[];
  programIds: string[];
  isSubprogram: boolean;
};

type ScriptSongVersion = SongVersion & {
  songTitle: string;
  tags?: string[];
};

type ProgramScriptProps = {
  programId: string;
};

async function loadProgramScriptData(programId: string) {
  const currentProgram = await getProgramById(programId);
  if (!currentProgram) {
    throw new Error('Program not found');
  }
  
  type ProgramRow = {
    id: string;
    title: string;
    element_ids: string[] | null;
    program_ids: string[] | null;
    is_subprogram: boolean;
  };
  
  const allPrograms = await sql`
    with latest_versions as (${latestProgramVersionCte()})
    select p.id, lv.title, lv.element_ids, lv.program_ids, lv.is_subprogram
    from programs p
    join latest_versions lv on lv.program_id = p.id
    where lv.archived = false
  ` as ProgramRow[];
  
  const programs: Program[] = allPrograms.map((p) => ({
    id: p.id,
    title: p.title,
    elementIds: p.element_ids ?? [],
    programIds: p.program_ids ?? [],
    isSubprogram: p.is_subprogram,
  }));
  
  const programMap: Record<string, Program> = {};
  programs.forEach((program) => {
    programMap[program.id] = program;
  });
  
  const collectVersionIds = (prog: Program | null, visited: Set<string> = new Set()): string[] => {
    if (!prog || visited.has(prog.id)) {
      return [];
    }
    visited.add(prog.id);
    
    const ids: string[] = [...prog.elementIds];
    prog.programIds.forEach((childId) => {
      const childProg = programMap[childId];
      if (childProg) {
        ids.push(...collectVersionIds(childProg, visited));
      }
    });
    return ids;
  };
  
  const versionIds = collectVersionIds(programMap[programId]);
  
  if (versionIds.length === 0) {
    return {
      program: {
        id: currentProgram.id,
        title: currentProgram.title,
        elementIds: currentProgram.elementIds,
        programIds: currentProgram.programIds,
        isSubprogram: currentProgram.isSubprogram ?? false,
      },
      programs,
      versions: {},
    };
  }
  
  type VersionRow = {
    id: string;
    song_id: string;
    song_title: string;
    label: string;
    content: string | null;
    rendered_content: SongVersion['renderedContent'];
    tags: string[] | null;
    audio_url: string | null;
    slides_movie_url: string | null;
    slide_movie_start: number | null;
    previous_version_id: string | null;
    next_version_id: string | null;
    original_version_id: string | null;
    bpm: number | null;
    transpose: number | null;
    archived: boolean;
    created_at: string;
    db_created_at: string;
    created_by: string | null;
    slide_credits: string | null;
    program_credits: string | null;
    blob_url: string | null;
  };
  
  const versions = await sql`
    select 
      v.id, 
      v.song_id, 
      s.title as song_title,
      v.label,
      v.content,
      v.rendered_content,
      s.tags,
      v.audio_url,
      v.slides_movie_url,
      v.slide_movie_start,
      v.previous_version_id,
      v.next_version_id,
      v.original_version_id,
      v.bpm,
      v.transpose,
      v.archived,
      v.created_at,
      v.db_created_at,
      v.created_by,
      v.slide_credits,
      v.program_credits,
      v.blob_url
    from song_versions v
    join songs s on v.song_id = s.id
    where v.id = ANY(${versionIds})
  ` as VersionRow[];
  
  const versionsMap: Record<string, ScriptSongVersion> = {};
  versions.forEach((v) => {
    versionsMap[v.id] = {
      id: v.id,
      songId: v.song_id,
      songTitle: v.song_title,
      label: v.label,
      content: v.content,
      renderedContent: v.rendered_content,
      tags: v.tags || [],
      audioUrl: v.audio_url,
      slidesMovieUrl: v.slides_movie_url,
      slideMovieStart: v.slide_movie_start,
      previousVersionId: v.previous_version_id,
      nextVersionId: v.next_version_id,
      originalVersionId: v.original_version_id,
      bpm: v.bpm,
      transpose: v.transpose,
      archived: v.archived,
      createdAt: v.created_at,
      dbCreatedAt: v.db_created_at,
      createdBy: v.created_by,
      slideCredits: v.slide_credits,
      programCredits: v.program_credits,
      blobUrl: v.blob_url,
    };
  });
  
  return {
    program: {
      id: currentProgram.id,
      title: currentProgram.title,
      elementIds: currentProgram.elementIds,
      programIds: currentProgram.programIds,
      isSubprogram: currentProgram.isSubprogram ?? false,
    },
    programs,
    versions: versionsMap,
  };
}

type Entry = 
  | { type: 'program'; program: Program; level: number }
  | { type: 'programHeading'; program: Program; level: number }
  | { type: 'version'; version: ScriptSongVersion; level: number };

function buildProgramEntries(
  selectedProgram: Program, 
  versions: Record<string, ScriptSongVersion>,
  programMap: Record<string, Program>,
  includeTopLevel: boolean
): Entry[] {
  const entries: Entry[] = [];
  const stack = [{ program: selectedProgram, level: 0 }];
  const visited = new Set<string>();
  
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current.program.id)) continue;
    
    visited.add(current.program.id);
    const { program, level } = current;
    
    if (level > 0 || includeTopLevel) {
      entries.push({ 
        type: level > 0 ? 'programHeading' : 'program', 
        program, 
        level 
      });
    }
    
    program.elementIds.forEach((versionId) => {
      const version = versions[versionId];
      if (version) {
        entries.push({ type: 'version', version, level: includeTopLevel ? level + 1 : level });
      }
    });
    
    const childPrograms = program.programIds
      .map((childId) => programMap[childId])
      .filter(Boolean);
    
    for (let i = childPrograms.length - 1; i >= 0; i--) {
      stack.push({ program: childPrograms[i], level: level + 1 });
    }
  }
  
  return entries;
}

const ProgramScript = async ({ programId }: ProgramScriptProps) => {
  let data;
  try {
    data = await loadProgramScriptData(programId);
  } catch (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        <div>Error: {error instanceof Error ? error.message : 'Failed to load program'}</div>
      </div>
    );
  }

  const { programs = [], versions = {}, program: selectedProgram } = data;

  const programMap: Record<string, Program> = Object.fromEntries(
    programs.map((p) => [p.id, p])
  );

  if (!selectedProgram) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        <div>Program not found</div>
      </div>
    );
  }

  const tocEntries = buildProgramEntries(selectedProgram, versions, programMap, true);
  const contentEntries = buildProgramEntries(selectedProgram, versions, programMap, false);

  return (
    <div className="min-h-screen bg-white text-black flex mx-auto justify-center print:block">
      <style dangerouslySetInnerHTML={{ __html: CHORDMARK_STYLES }} />
      <ScrollHandler />
      <div className="max-w-lg p-8 font-georgia fixed top-[50px] left-0 print:static print:max-w-none print:w-full print:top-auto print:left-auto" style={{ breakAfter: 'page' }}>
        {tocEntries.length > 0 && (
          <TableOfContents entries={tocEntries} programId={selectedProgram.id} />
        )}
      </div>
      <div className="max-w-3xl p-8 font-georgia print:max-w-none print:w-full flex flex-col gap-8">
        {contentEntries.map((entry) => {
          if (entry.type === 'programHeading') {
            return (
              <h2
                key={`heading-${entry.program.id}`}
                className="text-4xl mt-8 mb-4 font-semibold"
                id={`program-${entry.program.id}`}
                style={{ marginLeft: entry.level * 16 }}
              >
                <Link href={`/programs/${entry.program.id}`} className="hover:underline">
                  {entry.program.title}
                </Link>
              </h2>
            );
          }

          if (entry.type === 'version') {
            const { version } = entry;
            
            return (
              <div 
                key={`song-${version.id}`} 
                className="mb-8" 
                id={`song-${version.id}`}
                style={{ marginLeft: entry.level * 16 }}
              >
                <h3 className="text-xl mb-2 font-semibold">
                  <Link href={`/programs/${selectedProgram.id}?songId=${version.id}`} className="hover:underline">
                    {version.songTitle}
                  </Link>
                </h3>
                
                <VersionContent version={version} print={true} />
              </div>
            );
          }
          
          return null;
        })}
      </div>
    </div>
  );
};

export default ProgramScript;
