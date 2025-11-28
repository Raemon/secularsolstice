'use client';

import Link from 'next/link';
import { useUser } from './contexts/UserContext';

const Header = () => {
  const { userName, setUserName } = useUser();

  return (
    <header className="px-4 py-3 flex items-center justify-between">
      <h1 className="font-georgia font-semibold text-3xl"><Link href="/">Secular Solstice</Link></h1>
      <nav className="flex gap-6 items-center">
        <Link href="/songs" className="hover:underline">Songs</Link>
        <Link href="/programs" className="hover:underline">Programs</Link>
        <Link href="/bulk-create-versions" className="hover:underline">Bulk Create Versions</Link>
        <Link href="/slides" className="hover:underline">Slides</Link>
        <Link href="/chord-player" className="hover:underline">Chord Player</Link>
        <Link href="/chordmark-converter" className="hover:underline">Chordmark Converter</Link>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Your name"
          className="px-2 py-1 text-sm w-32"
        />
      </nav>
    </header>
  );
};

export default Header;

