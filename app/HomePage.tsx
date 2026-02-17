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
  aboutContent?: string;
};

const HomePage = ({ initialSongs, initialPrograms, homeContent = '', aboutContent = '' }: HomePageProps) => {
  const isMobile = useIsMobile();
  const [globeDataSource, setGlobeDataSource] = useState<GlobeDataSource>('programs');

  return (
    <>
    <div className="md:bg-black fixed left-0 top-0 h-[100vh] w-full z-[-3]"/>
      <div className="z-[0] flex flex-col items-center p-10 xl:p-0 lg:w-[50vw]">
        <div className="max-w-xl pt-12 mx-auto ">
          <style>
            {`
            .markdown-content h1 {
              margin-top: 0;
              margin-bottom: 50px;
              font-size: 4em;
            }
            .markdown-content hr {
              margin-top: 75px;
              margin-bottom: 65px;
              width: 100px;
              opacity: 0.5;
            }
            // .markdown-content p {
              
            // }
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
            className="markdown-content pb-[30px]"
            dangerouslySetInnerHTML={{ __html: marked.parse(homeContent, { breaks: true }) as string }}
          />
        </div>
      </div>
      <div className="bg-black w-full h-full z-[10] relative mt-20">
        <img 
          src="https://legacy.secularsolstice.com/wp-content/uploads/2013/08/folkatorium2.png" 
          alt="Solstice Folkatorium" 
          className="w-full z-[3] relative my-20 mx-auto pl-12" 
        />
        <div className="z-[0] flex flex-row p-10 xl:p-0 lg:w-full justify-between mx-auto">
          <div 
            className="markdown-content mt-[30px] w-full max-w-xl mx-auto"
            dangerouslySetInnerHTML={{ __html: marked.parse(aboutContent, { breaks: true }) as string }}
          />
          <div className="w-full max-w-xl flex flex-col gap-6 pb-12 pt-8 w-full mt-[30px] mx-auto">
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