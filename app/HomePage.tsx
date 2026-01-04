'use client';
import { useState } from 'react';
import { marked } from 'marked';
import RecentSongs from './RecentSongs';
import RecentPrograms from './RecentPrograms';
import Link from 'next/link';
import { GlobeBanner, type GlobeDataSource } from './solstice-banner';
import useIsMobile from './hooks/useIsMobile';
import type { Song } from './songs/types';
import type { Program } from './programs/types';

type HomePageProps = {
  initialSongs?: Song[];
  initialPrograms?: Program[];
  homeContent?: string;
  faqContent?: string;
};

const HomePage = ({ initialSongs, initialPrograms, homeContent = '', faqContent = '' }: HomePageProps) => {
  const content = homeContent;
  const isMobile = useIsMobile();
  const [globeDataSource, setGlobeDataSource] = useState<GlobeDataSource>('programs');

  return (
    <>
    <div className="md:bg-black fixed left-0 top-0 h-[100vh] w-[100vw] z-[-3]"/>
    <div className="z-[0] flex flex-col items-center p-10 xl:p-0 lg:w-[50vw]">
      <div className="max-w-xl pt-8 mx-auto ">
        <style>
          {`
          .markdown-content h1 {
            font-size: 3em;
          }
          @media (max-width: 1200px) {
            .markdown-content h1 {
              font-size: 2.2em;
            }
            .markdown-content p {
              font-size: 1em;
            }
          }
          `}
        </style>
        <div 
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: marked.parse(content, { breaks: true }) as string }}
        />
      </div>
      <div className="max-w-xl flex flex-col gap-6 pb-12 pt-8 w-full">
        <div>
          <Link href="/songs" className="font-georgia text-white hover:text-white/80 text-3xl mb-2 pb-2 block">Songs/Speeches</Link>
          <RecentSongs initialSongs={initialSongs} />
        </div>
        <div>
          <Link href="/programs" className="font-georgia text-white hover:text-white/80 text-3xl mb-2 pb-2 block">Programs</Link>
          <RecentPrograms initialPrograms={initialPrograms} />
        </div>
        {/* Globe data source toggle (for testing) */}
      </div>
    </div>
    {!isMobile && <GlobeBanner dataSource={globeDataSource} />}
    <div className="fixed bottom-2 right-0 w-[50vw] z-[1] text-center text-gray-600">
      <button onClick={() => setGlobeDataSource('programs')} className={`${globeDataSource === 'programs' ? 'underline' : 'opacity-50'} text-[10px] mr-2`}>PROGRAMS</button>
      <button onClick={() => setGlobeDataSource('lesswrong-events')} className={`${globeDataSource === 'lesswrong-events' ? 'underline' : 'opacity-70'} text-[10px]`}>EVENTS</button>
    </div>
  </>
  );
};

export default HomePage;