'use client';
import { useEffect, useState } from 'react';
import { marked } from 'marked';
import RecentSongs from './RecentSongs';
import RecentPrograms from './RecentPrograms';

const HomePage = () => {
  const [content, setContent] = useState<string>('');

  useEffect(() => {
    fetch('/home.md')
      .then(res => res.text())
      .then(text => setContent(text));
  }, []);

  return (
    <div className="p-4 w-full mx-auto flex flex-col lg:flex-row items-center lg:items-start lg:gap-36 justify-center">
      <div className="lg:w-1/2 max-w-xl pt-8">
        <div 
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: marked.parse(content, { breaks: true }) as string }}
        />
      </div>
      <div className="lg:w-1/2 max-w-xl flex flex-col gap-12 pb-12 pt-20">
        <div>
          <h3 className="font-georgia text-3xl mb-2 border-b border-gray-500 pb-2">Songs/Speeches</h3>
          <RecentSongs />
        </div>
        <div>
          <h3 className="font-georgia text-3xl mb-2 border-b border-gray-500 pb-2">Programs</h3>
          <RecentPrograms />
        </div>
      </div>
    </div>
  );
};

export default HomePage;