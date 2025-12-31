import type { SongVersion } from './types';
import ChordmarkRenderer from '../chordmark-converter/ChordmarkRenderer';
import LilypondViewer from './LilypondViewer';
import MarkdownRenderer from './MarkdownRenderer';
import BlobAttachment from './BlobAttachment';
import { AUDIO_EXTENSIONS } from '../../lib/audioExtensions';
import { detectFileType } from '../../lib/lyricsExtractor';
import DOMPurify from 'isomorphic-dompurify';

const VersionContent = ({version, print}: {
  version: SongVersion;
  print?: boolean;
}) => {
  const hasAudio = Boolean(version.audioUrl);
  const hasSlidesMovie = Boolean(version.slidesMovieUrl);
  const hasBlob = Boolean(version.blobUrl);
  const hasContent = Boolean(version.content);
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

  if (!hasAudio && !hasSlidesMovie && !hasBlob && !hasContent) {
    return <p className="text-gray-500 text-xs">No stored content for this version.</p>;
  }

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
      {hasBlob && <BlobAttachment blobUrl={version.blobUrl!} defaultExpanded={!hasContent} />}
    </div>
  );
};

export default VersionContent;
