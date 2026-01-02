'use client';

import { useState, useEffect } from 'react';
import type { SongVersion, RenderedContent } from './types';
import ChordmarkRenderer from '../chordmark-converter/ChordmarkRenderer';
import LilypondViewer from './LilypondViewer';
import MarkdownRenderer from './MarkdownRenderer';
import BlobAttachment from './BlobAttachment';
import DeferredRender from '../components/DeferredRender';
import { AUDIO_EXTENSIONS } from '../../lib/audioExtensions';
import { detectFileType } from '../../lib/lyricsExtractor';
import DOMPurify from 'isomorphic-dompurify';

// Component to lazy-load version content
const LazyVersionContentLoader = ({versionId, label, bpm, transpose, print, hasBlob, blobUrl}: {
  versionId: string;
  label: string;
  bpm: number | null;
  transpose: number | null;
  print?: boolean;
  hasBlob: boolean;
  blobUrl: string | null;
}) => {
  const [content, setContent] = useState<string | null>(null);
  const [renderedContent, setRenderedContent] = useState<RenderedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchContent = async () => {
      try {
        const res = await fetch(`/api/songs/versions/${versionId}/content`);
        if (!res.ok) throw new Error('Failed to load content');
        const data = await res.json();
        if (!cancelled) {
          setContent(data.content);
          setRenderedContent(data.renderedContent);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load content');
          setLoading(false);
        }
      }
    };
    fetchContent();
    return () => { cancelled = true; };
  }, [versionId]);

  if (loading) return <div className="text-gray-500 text-xs">Loading content...</div>;
  if (error) return <div className="text-red-400 text-xs">Error: {error}</div>;
  if (!content && !hasBlob) return <div className="text-gray-500 text-xs">No content available.</div>;

  const fileType = detectFileType(label, content || '');
  const isChordmarkFile = fileType === 'chordmark';
  const isLilypondFile = fileType === 'lilypond';
  const isMarkdownFile = fileType === 'markdown';
  const isUltimateGuitarFile = fileType === 'ultimateguitar';
  const isHtmlFile = fileType === 'html';
  const isTxtFile = fileType === 'text' || fileType === 'unknown';

  return (
    <>
      {content && isLilypondFile && (
        <LilypondViewer lilypondContent={content} versionId={versionId} renderedContent={renderedContent} />
      )}
      {content && isChordmarkFile && (
        <ChordmarkRenderer content={content} initialBpm={bpm || 90} initialTranspose={transpose ?? 0} print={print} renderedContent={renderedContent} />
      )}
      {content && isHtmlFile && (
        <div className="markdown-content text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
      )}
      {content && isTxtFile && (
        <div className="text-content text-xs overflow-x-auto max-w-full">{content}</div>
      )}
      {content && isMarkdownFile && (
        <MarkdownRenderer content={content} />
      )}
      {content && isUltimateGuitarFile && (
        <MarkdownRenderer content={content} monospace />
      )}
      {hasBlob && blobUrl && (
        <BlobAttachment blobUrl={blobUrl} defaultExpanded={!content} />
      )}
    </>
  );
};

const VersionContent = ({version, print}: {
  version: SongVersion;
  print?: boolean;
}) => {
  const hasAudio = Boolean(version.audioUrl);
  const hasSlidesMovie = Boolean(version.slidesMovieUrl);
  const hasBlob = Boolean(version.blobUrl);
  const hasContent = Boolean(version.content);
  // If content is null but we have a real version ID, we need to lazy load
  const needsLazyLoad = version.content === null && version.id && version.id !== 'new';
  const fileType = detectFileType(version.label, version.content || '');
  const isChordmarkFile = fileType === 'chordmark';
  const isLilypondFile = fileType === 'lilypond';
  const isMarkdownFile = fileType === 'markdown';
  const isUltimateGuitarFile = fileType === 'ultimateguitar';
  const isHtmlFile = fileType === 'html';
  const isTxtFile = fileType === 'text' || fileType === 'unknown';
  const audioUrl = version.audioUrl || '';
  const normalizedAudioUrl = audioUrl.toLowerCase();
  const isAudioFile = normalizedAudioUrl ? AUDIO_EXTENSIONS.some(ext => normalizedAudioUrl.endsWith(ext)) : false;
  const movieUrl = version.slidesMovieUrl || '';
  const normalizedMovieUrl = movieUrl.toLowerCase();
  const videoExtensions = ['.mp4', '.mov', '.webm', '.m4v'];
  const isVideoFile = normalizedMovieUrl ? videoExtensions.some(ext => normalizedMovieUrl.endsWith(ext)) : false;

  if (!hasAudio && !hasSlidesMovie && !hasBlob && !hasContent && !needsLazyLoad) {
    return <p className="text-gray-500 text-xs">No stored content for this version.</p>;
  }

  const loadingFallback = <div className="text-gray-500 text-xs">Loading content...</div>;

  return (
    <div className="space-y-2 lg:max-w-4xl">
      {hasAudio && (
        isAudioFile ? (
          <audio controls src={version.audioUrl || undefined} className="w-full">
            Your browser does not support the audio element.
          </audio>
        ) : (
          <a href={version.audioUrl || undefined} target="_blank" rel="noreferrer" className="text-blue-400 underline text-xs">
            Open audio file
          </a>
        )
      )}
      {needsLazyLoad ? (
        <DeferredRender fallback={loadingFallback}>
          <LazyVersionContentLoader
            versionId={version.id}
            label={version.label}
            bpm={version.bpm}
            transpose={version.transpose}
            print={print}
            hasBlob={hasBlob}
            blobUrl={version.blobUrl}
          />
        </DeferredRender>
      ) : (
        <>
          <DeferredRender fallback={loadingFallback}>
            {hasContent && isLilypondFile && (
              <LilypondViewer lilypondContent={version.content || ''} versionId={version.id} renderedContent={version.renderedContent} />
            )}
            {hasContent && isChordmarkFile && (
              <ChordmarkRenderer content={version.content || ''} initialBpm={version.bpm || 90} initialTranspose={version.transpose ?? 0} print={print} renderedContent={version.renderedContent} />
            )}
            {hasContent && isHtmlFile && (
              <div className="markdown-content text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(version.content || '') }} />
            )}
            {hasContent && isTxtFile && (
              <div className="text-content text-xs overflow-x-auto max-w-full">{version.content}</div>
            )}
            {hasContent && isMarkdownFile && (
              <MarkdownRenderer content={version.content || ''} />
            )}
            {hasContent && isUltimateGuitarFile && (
              <MarkdownRenderer content={version.content || ''} monospace />
            )}
          </DeferredRender>
          {hasBlob && (
            <DeferredRender fallback={loadingFallback}>
              <BlobAttachment blobUrl={version.blobUrl!} defaultExpanded={!hasContent} />
            </DeferredRender>
          )}
        </>
      )}
      {hasSlidesMovie && (
        isVideoFile ? (
          <video controls src={version.slidesMovieUrl || undefined} className="w-full">
            Your browser does not support the video element.
          </video>
        ) : (
          <a href={version.slidesMovieUrl || undefined} target="_blank" rel="noreferrer" className="text-blue-400 underline text-xs">
            Open slides movie
          </a>
        )
      )}
    </div>
  );
};

export default VersionContent;
