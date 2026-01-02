'use client';

import { useState, useEffect, ReactNode } from 'react';

const DeferredRender = ({children, fallback = null}: {children: ReactNode; fallback?: ReactNode}) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(() => setShouldRender(true));
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(() => setShouldRender(true), 0);
      return () => clearTimeout(id);
    }
  }, []);

  if (!shouldRender) return <>{fallback}</>;
  return <>{children}</>;
};

export default DeferredRender;
