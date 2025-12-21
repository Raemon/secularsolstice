'use client';

import Link from 'next/link';
import { useUser } from './contexts/UserContext';
import { usePathname } from 'next/navigation';
import UsernameInput from './feedback/components/UsernameInput';

const Header = () => {
  const pathname = usePathname();
  
  if (pathname?.includes('/print') || pathname?.match(/\/programs\/[^/]+\/slides/)) {
    return null;
  }

  const isFeedbackPage = pathname?.includes('/feedback');
  const isSongsPage = pathname?.includes('/songs');
  const isProgramsPage = pathname?.includes('/programs');
  const isChangelogPage = pathname?.includes('/changelog');

  return (
    <header className="px-4 pt-3 pb-2 flex flex-wrap items-center justify-between print:hidden border-b border-gray-500 mb-4">
      <h1 className="font-georgia text-2xl text-nowrap mr-auto lg:mr-0 mb-2"><Link href="/">Secular Solstice</Link></h1>
      <nav className="flex gap-3 lg:gap-6 items-center w-full lg:w-auto justify-between lg:ml-auto lg:justify-start order-2 lg:order-1 lg:pr-8">
        <Link href="/feedback" className={`hover:underline text-sm ${isFeedbackPage ? 'text-white' : 'text-gray-400 hover:text-white'}`}>Feedback</Link>
        <Link href="/songs" className={`hover:underline text-sm ${isSongsPage ? 'text-white' : 'text-gray-400 hover:text-white'}`}>Songs/Speeches</Link>
        <Link href="/programs" className={`hover:underline text-sm ${isProgramsPage ? 'text-white' : 'text-gray-400 hover:text-white'}`}>Programs</Link>
        <Link href="/changelog" className={`hover:underline text-sm ${isChangelogPage ? 'text-white' : 'text-gray-400 hover:text-white'}`}>Changelog</Link>
      </nav>
      <div className="order-1 lg:order-3">
        <UsernameInput />
      </div>
    </header>
  );
};

export default Header;

