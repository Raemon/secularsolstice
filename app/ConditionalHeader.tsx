'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';

const ConditionalHeader = () => {
  const pathname = usePathname();

  if (pathname?.includes('/slides')) return null;
  return (
    <>
      <Header />
      <div className="h-[45px]" />
    </>
  );
};

export default ConditionalHeader;
