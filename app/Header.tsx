'use client';

import Link from 'next/link';
import { useUser } from './contexts/UserContext';
import { usePathname } from 'next/navigation';

const Header = () => {
  const { userName, setUserName } = useUser();
  const pathname = usePathname();
  
  if (pathname?.includes('/print') || pathname?.match(/\/programs\/[^/]+\/slides/)) {
    return null;
  }

  return (
    <header className="px-4 py-3 flex items-center justify-between print:hidden">
      <h1 className="font-georgia text-4xl"><Link href="/">Secular Solstice</Link></h1>
      <nav className="flex gap-6 items-center">
        <Link href="/songs" className="hover:underline">Songs</Link>
        <Link href="/programs" className="hover:underline">Programs</Link>
        <Link href="/changelog" className="hover:underline">Changelog</Link>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Your name"
          className="px-2 py-1 w-32 bg-black rounded-sm"
        />
      </nav>
    </header>
  );
};

export default Header;

