'use client';

import { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import type { SongVersion } from './types';
import { convertMusicXmlToChordmark, detectFileType } from '../../lib/lyricsExtractor';
import ChordmarkRenderer from '../chordmark-converter/ChordmarkRenderer';

type TabType = 'sheet-music' | 'lyrics-chords' | 'raw-mxml';

const SheetMusicViewer = ({musicXml, url, version}:{musicXml?: string; url?: string; version?: SongVersion | null}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const osmdRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('sheet-music');
  const [xmlChordmark, setXmlChordmark] = useState<string>('');
  const [rawXml, setRawXml] = useState<string>('');
  const source = url || musicXml;
  const hasVersion = Boolean(version);
  const isChordmark = version ? detectFileType(version.label, version.content || '') === 'chordmark' : false;
  const chordmarkContent = isChordmark && version?.content ? version.content : xmlChordmark;

  // Fetch and convert MusicXML to chordmark
  useEffect(() => {
    if (!source || isChordmark) return; // Skip if already chordmark
    const lowerSource = source.toLowerCase();
    const isMusicXmlUrl = lowerSource.endsWith('.mxl') || lowerSource.endsWith('.musicxml') || lowerSource.endsWith('.xml') || lowerSource.endsWith('.mxml');
    const isMsczUrl = lowerSource.endsWith('.mscz');
    // Check if it's already XML content passed as string (MusicXML or MuseScore format)
    const isXmlContent = typeof musicXml === 'string' && (
      musicXml.includes('<score-partwise') || musicXml.includes('<score-timewise') || musicXml.includes('<museScore')
    );
    if (isXmlContent && musicXml) {
      setRawXml(musicXml);
      const chordmark = convertMusicXmlToChordmark(musicXml);
      setXmlChordmark(chordmark);
      return;
    }
    if (!url) return;
    // Handle .mscz files - need to convert via API
    if (isMsczUrl) {
      const convertMscz = async () => {
        try {
          // Get the lilypond server URL from config
          let serverUrl = process.env.NEXT_PUBLIC_LILYPOND_SERVER_URL;
          if (!serverUrl) {
            try {
              const configRes = await fetch('/api/config');
              if (configRes.ok) {
                const config = await configRes.json();
                serverUrl = config.lilypondServerUrl;
              }
            } catch (e) {
              console.warn('Failed to fetch config:', e);
            }
          }
          // Fetch the .mscz file
          const response = await fetch(url);
          if (!response.ok) return;
          const blob = await response.blob();
          const filename = url.split('/').pop() || 'file.mscz';
          const file = new File([blob], filename, { type: 'application/x-musescore' });
          const formData = new FormData();
          formData.append('file', file);
          // Use remote server if available, otherwise fall back to local API
          const endpoint = serverUrl ? `${serverUrl}/convert-mscz` : '/api/convert';
          const convertResponse = await fetch(endpoint, { method: 'POST', body: formData });
          if (!convertResponse.ok) return;
          const xmlContent = await convertResponse.text();
          setRawXml(xmlContent);
          const chordmark = convertMusicXmlToChordmark(xmlContent);
          setXmlChordmark(chordmark);
        } catch (err) {
          console.error('Failed to convert .mscz to MusicXML:', err);
        }
      };
      convertMscz();
      return;
    }
    if (!isMusicXmlUrl) return;
    const fetchAndConvert = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        if (lowerSource.endsWith('.mxl')) {
          // MXL is a ZIP archive containing the XML
          const arrayBuffer = await response.arrayBuffer();
          const zip = await JSZip.loadAsync(arrayBuffer);
          let xmlContent: string | null = null;
          for (const [filename, file] of Object.entries(zip.files)) {
            if (filename.endsWith('.xml') && !filename.startsWith('META-INF')) {
              xmlContent = await file.async('string');
              break;
            }
          }
          if (xmlContent) {
            setRawXml(xmlContent);
            const chordmark = convertMusicXmlToChordmark(xmlContent);
            setXmlChordmark(chordmark);
          }
        } else {
          const xmlContent = await response.text();
          setRawXml(xmlContent);
          const chordmark = convertMusicXmlToChordmark(xmlContent);
          setXmlChordmark(chordmark);
        }
      } catch (err) {
        console.error('Failed to convert MusicXML to chordmark:', err);
      }
    };
    fetchAndConvert();
  }, [source, url, musicXml, isChordmark]);

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

    if (activeTab === 'sheet-music') {
      loadAndRender();
    }

    return () => {
      cancelled = true;
        osmdRef.current = null;
    };
  }, [source, activeTab]);

  if (!source || (typeof source === 'string' && source.trim() === '')) {
    return <div className="text-gray-500 text-xs">No sheet music source provided</div>;
  }

  const tabs: {id: TabType, label: string}[] = [
    { id: 'sheet-music', label: 'Sheet Music' },
    { id: 'lyrics-chords', label: 'Chordmark' },
    { id: 'raw-mxml', label: 'Raw MusicXML' },
  ];

  return (
    <div>
      {hasVersion && (
        <div className="flex gap-1 flex-wrap monospace mb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-0.5 text-xs ${activeTab === tab.id ? 'font-medium' : 'text-gray-500'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      {activeTab === 'sheet-music' && (
        <>
          {error && <div className="text-red-600 text-xs">Error rendering sheet music: {error}</div>}
          {isLoading && <div className="text-gray-500 text-xs">Loading sheet music...</div>}
          <div ref={containerRef} className="w-full overflow-x-auto [&_svg]:invert" />
        </>
      )}
      {activeTab === 'lyrics-chords' && hasVersion && chordmarkContent && (
        <ChordmarkRenderer content={chordmarkContent} initialBpm={version?.bpm || 90} initialTranspose={version?.transpose ?? 0} defaultMode="lyrics+chords" />
      )}
      {activeTab === 'lyrics-chords' && hasVersion && !chordmarkContent && (
        <div className="text-xs text-gray-500">Lyrics + Chords view requires chordmark format content or MusicXML with lyrics</div>
      )}
      {activeTab === 'raw-mxml' && rawXml && (
        <pre className="text-xs overflow-auto max-h-[600px] bg-gray-900 p-2 whitespace-pre-wrap">{rawXml}</pre>
      )}
      {activeTab === 'raw-mxml' && !rawXml && (
        <div className="text-xs text-gray-500">No MusicXML content available</div>
      )}
    </div>
  );
};

export default SheetMusicViewer;
