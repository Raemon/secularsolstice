import type { SongVersion } from './types';
import ChordmarkRenderer from '../chordmark-converter/ChordmarkRenderer';
import LilypondViewer from './LilypondViewer';
import MarkdownRenderer from './MarkdownRenderer';
import { AUDIO_EXTENSIONS } from '../../lib/audioExtensions';
import { detectFileType } from '../../lib/lyricsExtractor';

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
  const isMarkdownFile = fileType === 'markdown' || fileType === 'ultimateguitar';
  const isTxtFile = fileType === 'text' || fileType === 'unknown';
  const audioUrl = version.audioUrl || '';
  const normalizedAudioUrl = audioUrl.toLowerCase();
  const isAudioFile = normalizedAudioUrl ? AUDIO_EXTENSIONS.some(ext => normalizedAudioUrl.endsWith(ext)) : false;
  const movieUrl = version.slidesMovieUrl || '';
  const normalizedMovieUrl = movieUrl.toLowerCase();
  const videoExtensions = ['.mp4', '.mov', '.webm', '.m4v'];
  const isVideoFile = normalizedMovieUrl ? videoExtensions.some(ext => normalizedMovieUrl.endsWith(ext)) : false;
  const blobFilename = version.blobUrl ? (() => {
    try {
      const pathname = new URL(version.blobUrl).pathname;
      return pathname.split('/').pop() || 'Attached file';
    } catch {
      return version.blobUrl.split('/').pop() || 'Attached file';
    }
  })() : null;

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
      {hasContent && isTxtFile && (
        <div className="text-content text-xs overflow-x-auto max-w-full">{version.content}</div>
      )}
      {hasContent && isMarkdownFile && (
        <MarkdownRenderer content={version.content || ''} />
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
      {hasBlob && (
        <a href={version.blobUrl || undefined} target="_blank" rel="noreferrer" className="text-blue-400 underline text-xs">
          📎 {blobFilename || 'Attached file'}
        </a>
      )}
    </div>
  );
};

export default VersionContent;


