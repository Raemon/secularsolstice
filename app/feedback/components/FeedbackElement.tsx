'use client';

import VoteWidget from "./VoteWidget";
import InlineCommentBox from "./InlineCommentBox";

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
  tags: string[];
};

type FeedbackElementProps = {
  version: VersionOption;
  index: number;
  onClick: () => void;
  isSelected: boolean;
};

const FeedbackElement = ({ version, index, onClick, isSelected }: FeedbackElementProps) => {
  const isSpeech = version?.tags?.includes('speech');

  return (
    <div
      className={`flex group/feedback-element justify-between items-start gap-2 text-sm px-2 py-1 cursor-pointer`}
      onClick={onClick}
    >
      <span className={`${isSelected ? 'text-primary' : ''} font-georgia text-base ${isSpeech ? 'italic' : ''}`}>
        {version?.songTitle || 'Unknown'}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <VoteWidget versionId={version?.id} songId={version?.songId} hideVotes/>
        <div className="opacity-0 group-hover/feedback-element:opacity-100">
          <InlineCommentBox versionId={version?.id} />
        </div>
      </div>
    </div>
  );
};

export default FeedbackElement;

