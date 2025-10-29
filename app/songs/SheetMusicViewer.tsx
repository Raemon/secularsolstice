'use client';

import { useEffect, useRef } from 'react';

const SheetMusicViewer = ({musicXml}:{musicXml: string | undefined}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<any>(null);

  useEffect(() => {
    const loadAndRender = async () => {
      if (!containerRef.current || !musicXml || musicXml.trim() === '') return;

      try {
        // Clear previous content
        containerRef.current.innerHTML = '';

        // Dynamically import OpenSheetMusicDisplay (client-side only)
        const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');

        // Create new OSMD instance
        osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
          autoResize: true,
          backend: 'svg',
          drawTitle: true,
        });

        // Load and render the MusicXML
        await osmdRef.current.load(musicXml);
        osmdRef.current.render();
      } catch (error) {
        console.error('Error rendering sheet music:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div class="text-red-600 text-xs">Error rendering sheet music: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
        }
      }
    };

    loadAndRender();

    return () => {
      if (osmdRef.current) {
        osmdRef.current = null;
      }
    };
  }, [musicXml]);

  if (!musicXml || musicXml.trim() === '') {
    return <div className="text-gray-500 text-xs">Loading sheet music...</div>;
  }

  return <div ref={containerRef} className="w-full overflow-x-auto" />;
};

export default SheetMusicViewer;

