'use client';
import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 1024;

const useIsMobile = (breakpoint: number = MOBILE_BREAKPOINT) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, [breakpoint]);

  return isMobile;
};

export default useIsMobile;