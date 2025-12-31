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
    <div className="p-4 w-full mx-auto flex gap-48 justify-center">
      <div className="w-1/2 max-w-xl pt-8">
        <div 
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: marked.parse(content, { breaks: true }) as string }}
        />
      </div>
      <div className="w-1/2 pt-12 max-w-xl flex flex-col gap-6">
        <h3 className="font-georgia text-2xl mb-2">Songs/Speeches</h3>
        <RecentSongs />
        <h3 className="font-georgia text-2xl mb-2 mt-6">Programs</h3>
        <RecentPrograms />
      </div>
    </div>
  );
};

export default HomePage;