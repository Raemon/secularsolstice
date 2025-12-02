import { marked } from 'marked';
import type { SongVersion } from './types';
import ChordmarkRenderer from '../chordmark-converter/ChordmarkRenderer';
import LilypondViewer from './LilypondViewer';
import { AUDIO_EXTENSIONS } from '../../lib/audioExtensions';
import { detectFileType } from '../../lib/lyricsExtractor';

const VersionContent = ({version, print}: {
  version: SongVersion;
  print?: boolean;
}) => {
  const hasAudio = Boolean(version.audioUrl);
  const hasContent = Boolean(version.content);
  const fileType = detectFileType(version.label, version.content || '');
  const isChordmarkFile = fileType === 'chordmark';
  const isLilypondFile = fileType === 'lilypond';
  const isTxtFile = fileType === 'text';
  const audioUrl = version.audioUrl || '';
  const normalizedAudioUrl = audioUrl.toLowerCase();
  const isAudioFile = normalizedAudioUrl ? AUDIO_EXTENSIONS.some(ext => normalizedAudioUrl.endsWith(ext)) : false;

  if (!hasAudio && !hasContent) {
    return <p className="text-gray-500 text-xs">No stored content for this version.</p>;
  }

  return (
    <div className="space-y-2">
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
      {hasContent && (
        isLilypondFile ? (
          <LilypondViewer lilypondContent={version.content || ''} versionId={version.id} renderedContent={version.renderedContent} />
        ) : isChordmarkFile ? (
          <ChordmarkRenderer content={version.content || ''} initialBpm={version.bpm || 90} initialTranspose={version.transpose ?? 0} print={print} renderedContent={version.renderedContent} />
        ) : isTxtFile ? (
          <pre className="text-content text-xs overflow-x-auto max-w-full">{version.content}</pre>
        ) : (
          <div 
            className="markdown-content text-xs whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: marked.parse(version.content || '', { breaks: true }) as string }}
          />
        )
      )}
    </div>
  );
};

export default VersionContent;


