'use client';

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
  tags: string[];
};

type SimpleProgramElementProps = {
  version?: VersionOption;
  index: number;
  onClick: () => void;
  isSelected: boolean;
};

const SimpleProgramElement = ({ version, index, onClick, isSelected }: SimpleProgramElementProps) => {
  const isSpeech = version?.tags?.includes('speech');

  return (
    <div
      className={`text-sm px-2 py-1 cursor-pointer hover:bg-black ${isSelected ? 'text-primary' : ''}`}
      onClick={onClick}
    >
      <span className={`font-georgia text-base ${isSpeech ? 'italic' : ''}`}>
        {version?.songTitle || 'Unknown'}
      </span>
    </div>
  );
};

export default SimpleProgramElement;

