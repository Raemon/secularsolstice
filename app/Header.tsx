'use client';

import Link from 'next/link';
import { useUser } from './contexts/UserContext';
import { usePathname } from 'next/navigation';
import UsernameInput from './feedback/components/UsernameInput';
import { useState, useRef, useEffect } from 'react';
import DownloadAllSongsButton from './songs/DownloadAllSongsButton';

const Header = () => {
  const pathname = usePathname();
  const { isAdmin } = useUser();
  const [poweruserOpen, setPoweruserOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const poweruserRef = useRef<HTMLDivElement>(null);
  const adminRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!poweruserOpen && !adminOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (poweruserOpen && poweruserRef.current && !poweruserRef.current.contains(event.target as Node)) {
        setPoweruserOpen(false);
      }
      if (adminOpen && adminRef.current && !adminRef.current.contains(event.target as Node)) {
        setAdminOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [poweruserOpen, adminOpen]);
  
  if (pathname?.includes('/print') || pathname?.match(/\/programs\/[^/]+\/slides/)) {
    return null;
  }

  const isFeedbackPage = pathname?.includes('/feedback');
  const isSongsPage = pathname?.includes('/songs');
  const isProgramsPage = pathname?.includes('/programs');
  const isBlogPage = pathname?.includes('/blog');
  const isChangelogPage = pathname?.includes('/changelog');
  const isAdminPage = pathname?.includes('/admin');

  const headerClasses = "absolute top-0 left-0 right-0 z-[100] px-4 pt-3 pb-2 flex flex-wrap items-center justify-between print:hidden";

  const activeTextClass = 'text-white';
  const inactiveTextClass = 'text-gray-400 hover:text-white';

  return (
    <header className={headerClasses}>
      <h1 className="font-georgia text-2xl text-nowrap mr-auto lg:mr-0"><Link href="/">Secular Solstice</Link></h1>
      <nav className="flex gap-3 lg:gap-6 items-center w-full lg:w-auto justify-between lg:ml-auto lg:justify-start order-2 lg:order-1 px-1 lg:pr-8 mt-3 sm:mt-0">
        <Link href="/songs" className={`hover:underline text-sm ${isSongsPage ? activeTextClass : inactiveTextClass}`}>Songs/Speeches</Link>
        <Link href="/programs" className={`hover:underline text-sm ${isProgramsPage ? activeTextClass : inactiveTextClass}`}>Programs</Link>
        <Link href="/blog" className={`hover:underline text-sm ${isBlogPage ? activeTextClass : inactiveTextClass}`}>Blog</Link>

        <div className="relative -mt-[2px]" ref={poweruserRef}>
          <button onClick={() => setPoweruserOpen(!poweruserOpen)} className={`hover:underline text-sm ${inactiveTextClass}`}>Power User ▼</button>
          {poweruserOpen && (
            <div className="absolute bg-black z-10 mt-1 border border-gray-500 shadow-lg min-w-[150px] top-full left-0">
              <Link href="/changelog" className="block px-2 py-1 text-sm hover:bg-gray-800 text-gray-200" onClick={() => setPoweruserOpen(false)}>Changelog</Link>
              <Link href="/public-backups" className="block px-2 py-1 text-sm hover:bg-gray-800 text-gray-200" onClick={() => setPoweruserOpen(false)}>Public Backups</Link>
              <DownloadAllSongsButton />
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="relative -mt-[2px]" ref={adminRef}>
            <button onClick={() => setAdminOpen(!adminOpen)} className={`hover:underline text-sm ${isAdminPage ? activeTextClass : inactiveTextClass}`}>Admin ▼</button>
            {adminOpen && (
              <div className="absolute bg-black z-10 mt-1 border border-gray-500 shadow-lg min-w-[150px] top-full left-0">
                <Link href="/db-backups" className="block px-2 py-1 text-sm hover:bg-gray-800 text-gray-200" onClick={() => setAdminOpen(false)}>Database Backups</Link>
                <Link href="/blobs" className="block px-2 py-1 text-sm hover:bg-gray-800 text-gray-200" onClick={() => setAdminOpen(false)}>Blob Storage</Link>
                <Link href="/test-lilypond" className="block px-2 py-1 text-sm hover:bg-gray-800 text-gray-200" onClick={() => setAdminOpen(false)}>Test Lilypond</Link>
                <Link href="/tools/import-secular-solstice" className="block px-2 py-1 text-sm hover:bg-gray-800 text-gray-200" onClick={() => setAdminOpen(false)}>Import solstice.github.io</Link>
                <Link href="/bulk-create-versions" className="block px-2 py-1 text-sm hover:bg-gray-800 text-gray-200" onClick={() => setPoweruserOpen(false)}>Bulk Import from Doc</Link>
                <Link href="/comments" className="block border-t border-gray-500 px-2 py-1 text-sm hover:bg-gray-800 text-gray-200" onClick={() => setAdminOpen(false)}>All Comments</Link>
                <Link href="/votes" className="block px-2 py-1 text-sm hover:bg-gray-800 text-gray-200" onClick={() => setAdminOpen(false)}>All Votes</Link>
                <Link href="/users/all" className="block px-2 py-1 text-sm hover:bg-gray-800 text-gray-200" onClick={() => setAdminOpen(false)}>All Users</Link>
              </div>
            )}
          </div>
        )}
      </nav>
      <div className="order-1 lg:order-3">
        <UsernameInput />
      </div>
    </header>
  );
};

export default Header;
