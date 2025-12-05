import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getProgramById } from '@/lib/programsRepository';

type ProgramRow = {
  id: string;
  title: string;
  element_ids: string[] | null;
  program_ids: string[] | null;
};

type VersionRow = {
  id: string;
  song_id: string;
  song_title: string;
  label: string;
  content: string | null;
  rendered_content: { htmlLyricsOnly?: string; plainText?: string } | null;
  tags: string[] | null;
};

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: programId } = await context.params;
  
  try {
    const currentProgram = await getProgramById(programId);
    if (!currentProgram) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Get all programs in one query
    const allPrograms = await sql`
      select id, title, element_ids, program_ids
      from programs
      where archived = false
    ` as ProgramRow[];

    const programMap: Record<string, ProgramRow> = {};
    allPrograms.forEach((program) => {
      programMap[program.id] = program;
    });

    // Recursively collect all version IDs
    const collectVersionIds = (prog: ProgramRow | null, visited: Set<string> = new Set()): string[] => {
      if (!prog || visited.has(prog.id)) return [];
      visited.add(prog.id);
      
      const ids: string[] = [...(prog.element_ids || [])];
      (prog.program_ids || []).forEach((childId) => {
        const childProg = programMap[childId];
        if (childProg) {
          ids.push(...collectVersionIds(childProg, visited));
        }
      });
      return ids;
    };

    const versionIds = collectVersionIds(programMap[programId]);
    
    if (versionIds.length === 0) {
      return NextResponse.json({
        program: currentProgram,
        programs: allPrograms.map(p => ({
          id: p.id,
          title: p.title,
          elementIds: p.element_ids ?? [],
          programIds: p.program_ids ?? [],
        })),
        versions: {},
      });
    }

    // Get all versions in ONE query
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

    const versionsMap: Record<string, any> = {};
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

    return NextResponse.json({
      program: currentProgram,
      programs: allPrograms.map(p => ({
        id: p.id,
        title: p.title,
        elementIds: p.element_ids ?? [],
        programIds: p.program_ids ?? [],
      })),
      versions: versionsMap,
    });
  } catch (error) {
    console.error('Error loading program script:', error);
    return NextResponse.json({ error: 'Failed to load program script' }, { status: 500 });
  }
}

