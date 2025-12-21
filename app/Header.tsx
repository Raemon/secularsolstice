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

  return (
    <header className="px-4 py-3 flex flex-wrap items-center justify-between print:hidden">
      <h1 className="font-georgia text-2xl text-nowrap mr-auto lg:mr-0"><Link href="/">Secular Solstice</Link></h1>
      <nav className="flex gap-6 items-center">
        <Link href="/feedback" className="hover:underline text-sm">Feedback</Link>
        <Link href="/songs" className="hover:underline text-sm">Songs</Link>
        <Link href="/programs" className="hover:underline text-sm">Programs</Link>
        <Link href="/changelog" className="hover:underline text-sm">Changelog</Link>
        <UsernameInput />
      </nav>
    </header>
  );
};

export default Header;

