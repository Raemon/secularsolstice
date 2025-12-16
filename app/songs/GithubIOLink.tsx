import { SongVersion } from './types';

const GithubIOLink = ({songTitle, tags = [], version, previousVersions = []}: {songTitle: string; tags?: string[]; version: SongVersion; previousVersions?: SongVersion[]}) => {
  const slug = songTitle ? encodeURIComponent(songTitle.trim().replace(/\s+/g, '_')) : null;
  const hasSecularImport = previousVersions.some((v) => v.createdBy === 'secularsolstice-import') || version.createdBy === 'secularsolstice-import';
  if (!slug || !hasSecularImport) {
    return null;
  }
  const isSpeech = tags.includes('speech');
  const url = isSpeech ? `https://secularsolstice.github.io/speeches/gen/${slug}.html` : `https://secularsolstice.github.io/songs/${slug}/gen`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 text-xs hover:text-blue-600 underline"
    >
      SecularSolstice.github.io
    </a>
  );
};

export default GithubIOLink;

