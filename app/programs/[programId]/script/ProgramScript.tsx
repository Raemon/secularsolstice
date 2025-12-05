import React from 'react';
import sql from '@/lib/db';
import { getProgramById } from '@/lib/programsRepository';

type Program = {
  id: string;
  title: string;
  elementIds: string[];
  programIds: string[];
};

type SongVersion = {
  id: string;
  songId: string;
  songTitle: string;
  label: string;
  content: string | null;
  renderedContent: {
    htmlLyricsOnly?: string;
    plainText?: string;
  } | null;
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
  };
  
  const allPrograms = await sql`
    select id, title, element_ids, program_ids
    from programs
    where archived = false
  ` as ProgramRow[];
  
  const programs: Program[] = allPrograms.map((p) => ({
    id: p.id,
    title: p.title,
    elementIds: p.element_ids ?? [],
    programIds: p.program_ids ?? [],
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
    rendered_content: { htmlLyricsOnly?: string; plainText?: string } | null;
    tags: string[] | null;
  };
  
  const versions = await sql`
    select 
      v.id, 
      v.song_id, 
      s.title as song_title,
      v.label,
      v.content,
      v.rendered_content,
      s.tags
    from song_versions v
    join songs s on v.song_id = s.id
    where v.id = ANY(${versionIds})
  ` as VersionRow[];
  
  const versionsMap: Record<string, SongVersion> = {};
  versions.forEach((v) => {
    versionsMap[v.id] = {
      id: v.id,
      songId: v.song_id,
      songTitle: v.song_title,
      label: v.label,
      content: v.content,
      renderedContent: v.rendered_content,
      tags: v.tags || [],
    };
  });
  
  return {
    program: {
      id: currentProgram.id,
      title: currentProgram.title,
      elementIds: currentProgram.elementIds,
      programIds: currentProgram.programIds,
    },
    programs,
    versions: versionsMap,
  };
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

  const programs: Program[] = data.programs || [];
  const versions: Record<string, SongVersion> = data.versions || {};
  const selectedProgram: Program | null = data.program || null;

  const programMap: Record<string, Program> = {};
  programs.forEach((program) => {
    programMap[program.id] = program;
  });

  if (!selectedProgram) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        <div>Program not found</div>
      </div>
    );
  }

  const renderProgram = (program: Program | null, level: number = 0, visited: Set<string> = new Set()): React.ReactElement[] => {
    if (!program || visited.has(program.id)) {
      return [];
    }
    visited.add(program.id);
    
    const elements: React.ReactElement[] = [];
    
    if (level > 0) {
      elements.push(
        <h2 key={`program-${program.id}`} className="text-2xl mt-8 mb-4" style={{fontFamily: 'Georgia, serif'}}>
          {program.title}
        </h2>
      );
    }
    
    program.elementIds.forEach((versionId) => {
      const version = versions[versionId];
      if (version) {
        const isText = version.tags?.includes('text');
        const isSpeech = version.tags?.includes('speech');
        const showFullContent = isText || isSpeech;
        
        let contentToDisplay = '';
        if (showFullContent && version.content) {
          contentToDisplay = version.content;
        } else if (version.renderedContent?.plainText) {
          contentToDisplay = version.renderedContent.plainText;
        } else if (version.content) {
          contentToDisplay = version.content;
        }
        
        elements.push(
          <div key={`version-${versionId}`} className="mb-8">
            <h3 className="text-xl mb-2" style={{fontFamily: 'Georgia, serif'}}>
              {version.songTitle}
            </h3>
            {contentToDisplay && (
              <div className="whitespace-pre-wrap">{contentToDisplay}</div>
            )}
          </div>
        );
      }
    });
    
    program.programIds.forEach((childProgramId) => {
      const childProgram = programMap[childProgramId] || null;
      elements.push(...renderProgram(childProgram, level + 1, visited));
    });
    
    visited.delete(program.id);
    return elements;
  };

  const elements = renderProgram(selectedProgram, 0);

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-4xl mb-8" style={{fontFamily: 'Georgia, serif'}}>
          {selectedProgram.title}
        </h1>
        {elements}
      </div>
    </div>
  );
};

export default ProgramScript;

