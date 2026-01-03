'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Program = {
  id: string;
  title: string;
};

type SongVersion = {
  id: string;
  songTitle: string;
  tags?: string[];
};

type Entry = 
  | { type: 'program'; program: Program; level: number }
  | { type: 'programHeading'; program: Program; level: number }
  | { type: 'version'; version: SongVersion; level: number };

type TableOfContentsProps = {
  entries: Entry[];
  programId: string;
};

export const TableOfContents = ({ entries, programId }: TableOfContentsProps) => {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string, itemType: 'program' | 'song') => {
    e.preventDefault();
    
    // Update URL with query param
    const url = new URL(window.location.href);
    url.searchParams.set('scrollTo', targetId);
    url.searchParams.set('type', itemType);
    router.push(url.pathname + url.search, { scroll: false });
    
    // Scroll to the element
    const element = document.getElementById(`${itemType}-${targetId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="mb-8">
      <div className="space-y-1">
        {entries.map((entry) => (
          <React.Fragment key={`toc-${entry.type === 'version' ? entry.version.id : entry.program.id}`}>
            {(entry.type === 'program' || entry.type === 'programHeading') && (
              <a 
                href={`#program-${entry.program.id}`}
                onClick={(e) => handleClick(e, entry.program.id, 'program')}
                className={`block pt-4 mt-4 font-semibold ${entry.level === 0 ? 'text-2xl' : 'text-xl'} hover:underline cursor-pointer`}
              >
                {entry.program.title}
              </a>
            )}
            {entry.type === 'version' && (
              <a 
                href={`#song-${entry.version.id}`}
                onClick={(e) => handleClick(e, entry.version.id, 'song')}
                className={`block hover:underline text-base cursor-pointer ${entry.version.tags?.includes('speech') ? 'italic' : ''}`}
              >
                {entry.version.songTitle}
              </a>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
