'use client';
import { useEffect, useState } from 'react';
import { marked } from 'marked';
import RecentSongs from './RecentSongs';
import RecentPrograms from './RecentPrograms';
import Link from 'next/link';

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

  return (
    <div className="p-4 w-full mx-auto flex flex-col lg:flex-row items-center lg:items-start lg:gap-36 justify-center">
      <div className="lg:w-1/2 max-w-xl pt-8">
        <div 
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: marked.parse(content, { breaks: true }) as string }}
        />
        {/* {faqContent && (
          <div 
            className="markdown-content mt-8"
            dangerouslySetInnerHTML={{ __html: marked.parse(faqContent, { breaks: true }) as string }}
          />
        )} */}
      </div>
      <div className="lg:w-1/2 max-w-xl flex flex-col gap-12 pb-12 pt-20">
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
  );
};

export default HomePage;