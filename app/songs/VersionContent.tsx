import { marked } from 'marked';
import type { SongVersion } from './types';
import ChordmarkRenderer from '../chordmark-converter/ChordmarkRenderer';
import LilypondViewer from './LilypondViewer';

const VersionContent = ({version}: {
  version: SongVersion;
}) => {
  const hasAudio = Boolean(version.audioUrl);
  const hasContent = Boolean(version.content);
  const isTxtFile = version.label.toLowerCase().endsWith('.txt');
  const label = version.label.toLowerCase();
  const isChordmarkFile = label.endsWith('.chordmark')
  const isLilypondFile = label.endsWith('.ly') || label.endsWith('.lilypond')

  if (!hasAudio && !hasContent) {
    return <p className="text-gray-500 text-xs">No stored content for this version.</p>;
  }

  return (
    <div className="space-y-2">
      {hasAudio && (
        <audio controls src={version.audioUrl || undefined} className="w-full">
          Your browser does not support the audio element.
        </audio>
      )}
      {hasContent && (
        isLilypondFile ? (
          <LilypondViewer lilypondContent={version.content || ''} versionId={version.id} renderedContent={version.renderedContent} />
        ) : isChordmarkFile ? (
          <ChordmarkRenderer content={version.content || ''} initialBpm={version.bpm || 90} />
        ) : isTxtFile ? (
          <pre className="text-content text-gray-800 text-xs overflow-x-auto max-w-full">{version.content}</pre>
        ) : (
          <div 
            className="markdown-content text-gray-800 text-xs whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: marked.parse(version.content || '', { breaks: true }) as string }}
          />
        )
      )}
    </div>
  );
};

export default VersionContent;


