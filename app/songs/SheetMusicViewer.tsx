'use client';

import { useEffect, useRef, useState } from 'react';

const SheetMusicViewer = ({musicXml, url}:{musicXml?: string; url?: string}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const osmdRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const source = url || musicXml;

  useEffect(() => {
    let cancelled = false;

    const loadAndRender = async () => {
      if (!containerRef.current || !source || (typeof source === 'string' && source.trim() === '')) return;
      setIsLoading(true);
      setError(null);

      try {
        // Clear previous content
        containerRef.current.innerHTML = '';

        // Dynamically import OpenSheetMusicDisplay (client-side only)
        const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
        if (cancelled) return;

        // Create new OSMD instance
        const osmd = new OpenSheetMusicDisplay(containerRef.current, {
          autoResize: true,
          backend: 'svg',
          drawTitle: true,
        });
        osmdRef.current = osmd;

        // Load - OSMD can handle both URLs and XML strings
        await osmd.load(source);
        if (cancelled) return;

        // Render after successful load
        osmd.zoom = 0.75;
        osmd.render();
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Error rendering sheet music:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    loadAndRender();

    return () => {
      cancelled = true;
        osmdRef.current = null;
    };
  }, [source]);

  if (!source || (typeof source === 'string' && source.trim() === '')) {
    return <div className="text-gray-500 text-xs">No sheet music source provided</div>;
  }

  if (error) {
    return <div className="text-red-600 text-xs">Error rendering sheet music: {error}</div>;
  }

  return (
    <div>
      {isLoading && <div className="text-gray-500 text-xs">Loading sheet music...</div>}
      <div ref={containerRef} className="w-full overflow-x-auto [&_svg]:invert" />
    </div>
  );
};

export default SheetMusicViewer;
