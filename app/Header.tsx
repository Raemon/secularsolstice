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
  const isScriptPage = pathname?.match(/\/programs\/[^/]+\/script/);

  const headerClasses = isScriptPage
    ? "px-4 pt-3 pb-2 flex flex-wrap items-center justify-between print:hidden border-b border-gray-300 bg-white"
    : "px-4 pt-3 pb-2 flex flex-wrap items-center justify-between print:hidden border-b border-gray-500 ";

  const activeTextClass = isScriptPage ? 'text-black' : 'text-white';
  const inactiveTextClass = isScriptPage ? 'text-gray-600 hover:text-black' : 'text-gray-400 hover:text-white';

  return (
    <header className={headerClasses}>
      <h1 className={`font-georgia text-2xl text-nowrap mr-auto lg:mr-0 ${isScriptPage ? 'text-black' : ''}`}><Link href="/">Secular Solstice</Link></h1>
      <nav className="flex gap-3 lg:gap-6 items-center w-full lg:w-auto justify-between lg:ml-auto lg:justify-start order-2 lg:order-1 px-1 lg:pr-8 mt-3 sm:mt-0">
        <Link href="/songs" className={`hover:underline text-sm ${isSongsPage ? activeTextClass : inactiveTextClass}`}>Songs/Speeches</Link>
        <Link href="/programs" className={`hover:underline text-sm ${isProgramsPage ? activeTextClass : inactiveTextClass}`}>Programs</Link>
        <Link href="/feedback" className={`hover:underline text-sm ${isFeedbackPage ? activeTextClass : inactiveTextClass}`}>Feedback</Link>
        <Link href="/changelog" className={`hover:underline text-sm ${isChangelogPage ? activeTextClass : inactiveTextClass}`}>Changelog</Link>
      </nav>
      <div className="order-1 lg:order-3">
        <UsernameInput lightMode={!!isScriptPage} />
      </div>
    </header>
  );
};

export default Header;

