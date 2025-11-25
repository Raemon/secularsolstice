import Link from 'next/link';

const Header = () => {
  return (
    <header className="px-4 py-3 flex items-center justify-between">
      <h1 className="font-georgia text-2xl"><Link href="/">Secular Solstice</Link></h1>
      <nav className="flex gap-6">
        <Link href="/songs" className="hover:underline">Songs</Link>
        <Link href="/programs" className="hover:underline">Programs</Link>
        <Link href="/bulk-create-versions" className="hover:underline">Bulk Create Versions</Link>
        <Link href="/slides" className="hover:underline">Slides</Link>
        <Link href="/chord-player" className="hover:underline">Chord Player</Link>
        <Link href="/chordmark-converter" className="hover:underline">Chordmark Converter</Link>
      </nav>
    </header>
  );
};

export default Header;

