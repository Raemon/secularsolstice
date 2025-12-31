'use client';

import { useEffect, useState } from 'react';
import ChevronDropdown from '../components/ChevronDropdown';
import { extractLyricsFromLilypond } from '@/lib/lyricsExtractor';

type ViewMode = 'svg' | 'raw' | 'lyrics' | 'lyrics-chords';

const LilypondViewer = ({lilypondContent, versionId, renderedContent}:{lilypondContent: string | undefined, versionId?: string, renderedContent?: {lilypond?: string; legacy?: string; [key: string]: string | undefined} | null}) => {
  const [svgs, setSvgs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('svg');

  const extractChordsFromLilypond = (content: string): string[] => {
    const chords: string[] = [];
    const chordModeRegex = /\\chordmode\s*\{([^}]+)\}/g;
    let match;
    
    while ((match = chordModeRegex.exec(content)) !== null) {
      const chordBlock = match[1];
      const tokens = chordBlock.split(/\s+/).filter(t => t.length > 0);
      
      for (const token of tokens) {
        const cleaned = token
          .replace(/\\/g, '')
          .replace(/[{}]/g, '')
          .replace(/[0-9]+/g, '')
          .trim();
        
        if (cleaned && !cleaned.startsWith('%')) {
          chords.push(cleaned);
        }
      }
    }
    
    return chords;
  };

  useEffect(() => {
    const convertToSvg = async () => {
      if (!lilypondContent || lilypondContent.trim() === '') return;
      if (viewMode !== 'svg') return; // Only convert for SVG mode

      // Check if we have cached rendered content for lilypond
      if (renderedContent?.lilypond) {
        console.log('[LilypondViewer] Using cached rendered content');
        try {
          const parsed = JSON.parse(renderedContent.lilypond);
          setSvgs(parsed);
          setIsLoading(false);
          return;
        } catch (err) {
          console.error('[LilypondViewer] Error parsing cached lilypond content:', err);
          // Fall through to reconvert
        }
      }
      
      // Fall back to legacy format (whole renderedContent was a JSON string)
      if (renderedContent?.legacy) {
        console.log('[LilypondViewer] Using cached legacy rendered content');
        try {
          const parsed = JSON.parse(renderedContent.legacy);
          setSvgs(parsed);
          setIsLoading(false);
          return;
        } catch (err) {
          console.error('[LilypondViewer] Error parsing legacy cached content:', err);
          // Fall through to reconvert
        }
      }

      console.log('[LilypondViewer] Starting conversion, content length:', lilypondContent.length);
      setIsLoading(true);
      setError(null);

      try {
        // Fetch config from server to get the lilypond server URL (avoids Turbopack env var caching issues)
        let lilypondServerUrl = process.env.NEXT_PUBLIC_LILYPOND_SERVER_URL;
        if (!lilypondServerUrl) {
          try {
            const configRes = await fetch('/api/config');
            if (configRes.ok) {
              const config = await configRes.json();
              lilypondServerUrl = config.lilypondServerUrl;
            }
          } catch (e) {
            console.warn('[LilypondViewer] Failed to fetch config:', e);
          }
        }
        const endpoint = lilypondServerUrl 
          ? `${lilypondServerUrl}/convert`
          : '/api/lilypond-to-svg';
        const isExternalServer = !!lilypondServerUrl;

        console.log('[LilypondViewer] Sending request to', endpoint);
        const response = await fetch(endpoint, {
          method: 'POST',
          ...(isExternalServer 
            ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: lilypondContent }) }
            : { body: (() => { const fd = new FormData(); fd.append('content', lilypondContent); return fd; })() }
        ),
        });

        console.log('[LilypondViewer] Response status:', response.status, response.statusText);

        if (!response.ok) {
          const responseText = await response.text();
          console.error('[LilypondViewer] Error response:', responseText);
          
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch {
            throw new Error(`Server error (${response.status}): ${responseText.substring(0, 200)}`);
          }
          
          console.error('[LilypondViewer] API Error:', errorData);
          throw new Error(errorData.error || 'Failed to convert LilyPond to SVG');
        }

        const data = await response.json();
        console.log('[LilypondViewer] Conversion successful:', data.pageCount, 'pages');
        const svgArray = data.svgs || [];
        setSvgs(svgArray);

        if (versionId && svgArray.length > 0) {
          console.log('[LilypondViewer] Saving rendered content to database');
          try {
            await fetch(`/api/songs/versions/${versionId}/rendered-content`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ renderedContent: { lilypond: JSON.stringify(svgArray) } }),
            });
            console.log('[LilypondViewer] Successfully cached rendered content');
          } catch (cacheErr) {
            console.error('[LilypondViewer] Failed to cache rendered content:', cacheErr);
          }
        }
      } catch (err) {
        console.error('[LilypondViewer] Error converting LilyPond to SVG:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    convertToSvg();
  }, [lilypondContent, versionId, renderedContent, viewMode]);

  if (!lilypondContent || lilypondContent.trim() === '') {
    return <div className="text-gray-500 text-xs">No LilyPond content available</div>;
  }

  const viewModeOptions = [
    { value: 'svg', label: 'Sheet Music' },
    { value: 'raw', label: 'Raw Lilypond' },
    { value: 'lyrics', label: 'Lyrics Only' },
    { value: 'lyrics-chords', label: 'Lyrics + Chords' },
  ];

  const renderContent = () => {
    if (viewMode === 'raw') {
      return (
        <pre className="text-gray-400 text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono">
          {lilypondContent}
        </pre>
      );
    }

    if (viewMode === 'lyrics') {
      const lyrics = extractLyricsFromLilypond(lilypondContent);
      return (
        <pre className="text-gray-400 text-sm whitespace-pre-wrap">
          {lyrics || 'No lyrics found'}
        </pre>
      );
    }

    if (viewMode === 'lyrics-chords') {
      const lyrics = extractLyricsFromLilypond(lilypondContent);
      const chords = extractChordsFromLilypond(lilypondContent);
      return (
        <div className="space-y-4">
          {chords.length > 0 && (
            <div>
              <div className="text-gray-200 text-xs font-semibold mb-1">Chords:</div>
              <div className="text-gray-400 text-sm">{chords.join(' | ')}</div>
            </div>
          )}
          <div>
            <div className="text-gray-200 text-xs font-semibold mb-1">Lyrics:</div>
            <pre className="text-gray-400 text-sm whitespace-pre-wrap">
              {lyrics || 'No lyrics found'}
            </pre>
          </div>
        </div>
      );
    }

    // SVG mode
    if (isLoading) {
      return <div className="text-gray-500 text-xs">Converting LilyPond to sheet music...</div>;
    }

    if (error) {
      return (
        <div className="text-red-600 text-xs">
          <div>Error rendering sheet music: {error}</div>
          <details className="mt-2">
            <summary className="cursor-pointer text-gray-400">Show LilyPond source</summary>
            <pre className="mt-2 text-gray-300 overflow-x-auto whitespace-pre-wrap break-words">{lilypondContent}</pre>
          </details>
        </div>
      );
    }

    if (svgs.length === 0) {
      return <div className="text-gray-500 text-xs">No sheet music generated</div>;
    }

    return (
      <div className="w-full space-y-4">
        {svgs.map((svg, index) => (
          <div 
            key={index} 
            className="w-full overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gray-400 text-xs">View:</span>
        <ChevronDropdown
          value={viewMode}
          options={viewModeOptions}
          onChange={(value) => setViewMode(value as ViewMode)}
        />
      </div>
      {renderContent()}
    </div>
  );
};

export default LilypondViewer;
