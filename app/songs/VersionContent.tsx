import { marked } from 'marked';
import type { SongVersion } from './types';

const VersionContent = ({version}: {
  version: SongVersion;
}) => {
  const hasAudio = Boolean(version.audioUrl);
  const hasContent = Boolean(version.content);
  const isTxtFile = version.label.toLowerCase().endsWith('.txt');

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
        isTxtFile ? (
          <pre className="text-content text-gray-800 text-xs overflow-x-auto">{version.content}</pre>
        ) : (
          <div 
            className="markdown-content text-gray-800 text-xs"
            dangerouslySetInnerHTML={{ __html: marked.parse(version.content || '') }}
          />
        )
      )}
    </div>
  );
};

export default VersionContent;

