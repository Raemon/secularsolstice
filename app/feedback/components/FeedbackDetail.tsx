'use client';

import { useEffect, useMemo, useState } from 'react';
import VoteWidget from './VoteWidget';
import { generateChordmarkRenderedContent } from '../../chordmark-converter/clientRenderUtils';
import { CHORDMARK_STYLES } from '../../chordmark-converter/ChordmarkRenderer';
import { detectFileType } from '../../../lib/lyricsExtractor';

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
  tags: string[];
};

type SongVersion = {
  id: string;
  songId: string;
  label: string;
  createdAt: string;
  content?: string | null;
};

type FeedbackDetailProps = {
  version: VersionOption;
  cachedVersion?: SongVersion;
  content?: string;
};

const FeedbackDetail = ({ version, cachedVersion, content="" }: FeedbackDetailProps) => {
  const [fullVersion, setFullVersion] = useState<SongVersion | null>(cachedVersion || null);
  const [loading, setLoading] = useState(!cachedVersion);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedVersion) {
      setFullVersion(cachedVersion);
      setLoading(false);
      return;
    }
    const loadVersion = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/songs/versions/${version.id}?includeContent=true`);
        if (!response.ok) {
          throw new Error('Failed to load version');
        }
        const data = await response.json();
        setFullVersion(data.version);
      } catch (err) {
        console.error('Failed to load version:', err);
        setError(err instanceof Error ? err.message : 'Failed to load version');
      } finally {
        setLoading(false);
      }
    };
    loadVersion();
  }, [version.id, cachedVersion]);

  const fileType = detectFileType(fullVersion?.label || version.label, content);
  const isChordmarkFile = fileType === 'chordmark';
  const chordmarkRender = useMemo(() => isChordmarkFile ? generateChordmarkRenderedContent(content) : null, [isChordmarkFile, content]);
  const lyricsHtml = chordmarkRender?.htmlLyricsOnly;

  return (
    <div className="flex flex-col pl-8">
      {loading && <p className="text-gray-400">Loading...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && !error && (
        <>
          {isChordmarkFile && lyricsHtml ? (
            <div className="text-sm">
              <style dangerouslySetInnerHTML={{ __html: CHORDMARK_STYLES }} />
              <div className="styled-chordmark text-xs lyrics-wrap" dangerouslySetInnerHTML={{ __html: lyricsHtml }} />
            </div>
          ) : (
            <div className="whitespace-pre-wrap font-mono text-sm">
              {content || 'No content available'}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FeedbackDetail;
