'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';

const ConditionalHeader = () => {
  const pathname = usePathname();
  console.log(pathname);
  // const hideHeader = pathname.includes('/feedback') || pathname?.includes('/results');
  // if (hideHeader) return null;
  return <Header />;
};

export default ConditionalHeader;
