'use client';
import { useEffect, useState } from 'react';
import { marked } from 'marked';
import RecentSongs from './RecentSongs';
import RecentPrograms from './RecentPrograms';
import Link from 'next/link';
import { SolsticeSeasonBanner } from './solstice-banner';
import useIsMobile from './hooks/useIsMobile';

const HomePage = () => {
  const [content, setContent] = useState<string>('');
  const [faqContent, setFaqContent] = useState<string>('');

  useEffect(() => {
    fetch('/home.md')
      .then(res => res.text())
      .then(text => setContent(text));
    fetch('/faq.md')
      .then(res => res.text())
      .then(text => setFaqContent(text));
  }, []);

  const isMobile = useIsMobile()

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
          <RecentSongs />
        </div>
        <div>
          <Link href="/programs" className="font-georgia text-white hover:text-white/80 text-3xl mb-2 pb-2 block">Programs</Link>
          <RecentPrograms />
        </div>
      </div>
    </div>
    {!isMobile && <SolsticeSeasonBanner />}
  </>
  );
};

export default HomePage;