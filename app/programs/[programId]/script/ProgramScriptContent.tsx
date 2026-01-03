'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import VersionContent from '@/app/songs/VersionContent';
import { TableOfContents } from './TableOfContents';
import type { SongVersion } from '@/app/songs/types';
import ProgramViews from '../../programBrowser/ProgramViews';

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

type Entry = 
  | { type: 'program'; program: Program; level: number }
  | { type: 'programHeading'; program: Program; level: number }
  | { type: 'version'; version: ScriptSongVersion; level: number };

type ProgramScriptContentProps = {
  programId: string;
  contentEntries: Entry[];
  tocEntries: Entry[];
};

const ProgramScriptContent = ({ programId, contentEntries, tocEntries }: ProgramScriptContentProps) => {
  const programEntry = contentEntries.find(e => e.type === 'program');
  const programTitle = programEntry?.program.title ?? '';
  const [showSongs, setShowSongs] = useState(true);
  const [showSpeeches, setShowSpeeches] = useState(true);
  const [showActivities, setShowActivities] = useState(true);

  const getVersionCategory = (version: ScriptSongVersion): 'song' | 'speech' | 'activity' => {
    const tags = version.tags || [];
    if (tags.includes('speech')) return 'speech';
    if (tags.includes('activity')) return 'activity';
    return 'song';
  };

  const shouldShowVersion = (version: ScriptSongVersion): boolean => {
    const category = getVersionCategory(version);
    if (category === 'song') return showSongs;
    if (category === 'speech') return showSpeeches;
    if (category === 'activity') return showActivities;
    return true;
  };

  const filterEntries = (entries: Entry[]) => entries.filter(entry => {
    if (entry.type === 'version') {
      return shouldShowVersion(entry.version);
    }
    return true;
  });

  const filteredContentEntries = filterEntries(contentEntries);
  const filteredTocEntries = filterEntries(tocEntries);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: 8.5in 11in;
            margin: 0;
          }
          body {
            padding: 1in;
          }
          .print-title-page {
            min-height: calc(11in - 2in);
            display: flex;
            align-items: center;
            justify-content: center;
            break-after: page;
            page-break-after: always;
            margin: 0 !important;
            padding: 0;
          }
          .print-toc-container {
            position: static !important;
            max-width: none !important;
            width: 100% !important;
            top: auto !important;
            left: auto !important;
            padding: 0 !important;
            margin-bottom: 0 !important;
            break-after: page;
            page-break-after: always;
          }
          .print-content-container {
            max-width: none !important;
            width: 100% !important;
            padding: 0 !important;
            display: block !important;
            gap: 0 !important;
          }
          .print-content-container > * {
            display: block;
          }
          .print-top-level-program-title {
            display: none !important;
          }
          .print-subprogram-title {
            min-height: calc(11in - 2in);
            display: flex;
            align-items: center;
            justify-content: center;
            break-after: page;
            page-break-after: always;
            margin: 0 !important;
            padding: 0;
          }
          .print-song-container {
            break-before: page;
            page-break-before: always;
            break-after: page;
            page-break-after: always;
            min-height: calc(11in - 2in);
            display: flex;
            flex-direction: column;
            margin: 0 !important;
            padding: 0;
          }
          .print-song-content {
            flex-shrink: 0;
          }
          .print-song-spacer {
            flex-grow: 1;
            flex-shrink: 1;
            min-height: 0;
          }
        }
      `}} />
      <div className="hidden print:block print-title-page font-georgia">
        <h1 className="text-5xl font-semibold text-center">{programTitle}</h1>
      </div>
      <div className="max-w-lg p-8 lg:fixed lg:top-[50px] lg:left-0 lg:max-h-[calc(100vh-50px)] lg:overflow-y-auto print-toc-container">
        <div className="print:hidden">
          <ProgramViews programId={programId} currentView="script" />
        </div>
        <div className="flex gap-2 mb-4 text-sm print:hidden mt-4 print:hidden">
          <button onClick={() => setShowSongs(!showSongs)} className={`px-2 py-0.5 border border-gray-500 rounded-sm ${showSongs ? 'opacity-100' : 'opacity-50'}`}>
            Songs
          </button>
          <button onClick={() => setShowSpeeches(!showSpeeches)} className={`px-2 py-0.5 border border-gray-500 rounded-sm ${showSpeeches ? 'opacity-100' : 'opacity-50'}`}>
            Speeches
          </button>
          <button onClick={() => setShowActivities(!showActivities)} className={`px-2 py-0.5 border border-gray-500 rounded-sm ${showActivities ? 'opacity-100' : 'opacity-50'}`}>
            Activities
          </button>
        </div>
        <div className="font-georgia">
          {filteredTocEntries.length > 0 && (
            <TableOfContents entries={filteredTocEntries} programId={programId} />
          )}
        </div>
      </div>
      <div className="max-w-2xl p-8 font-georgia print-content-container flex flex-col gap-8">
        {filteredContentEntries.map((entry) => {
          if (entry.type === 'program') {
            return (
              <h1
                key={`program-${entry.program.id}`}
                className="text-5xl mt-8 mb-4 print-top-level-program-title"
                id={`program-${entry.program.id}`}
              >
                <Link href={`/programs/${entry.program.id}`} className="hover:underline">
                  {entry.program.title}
                </Link>
              </h1>
            );
          }

          if (entry.type === 'programHeading') {
            return (
              <h2
                key={`heading-${entry.program.id}`}
                className="text-[42px] underline mt-8 mb-4 print-subprogram-title"
                id={`program-${entry.program.id}`}
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
                className="mb-8 print-song-container" 
                id={`song-${version.id}`}
              >
                <div className="print-song-content">
                  <h3 className="text-3xl mb-2">
                    <Link href={`/programs/${programId}/${version.id}`} className="hover:underline">
                      {version.songTitle}
                    </Link>
                  </h3>
                  
                  <VersionContent version={version} print={true} />
                </div>
                <div className="print-song-spacer"></div>
              </div>
            );
          }
          
          return null;
        })}
      </div>
    </>
  );
};

export default ProgramScriptContent;
