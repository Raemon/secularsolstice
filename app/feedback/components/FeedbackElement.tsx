'use client';

import VoteWidget from "./VoteWidget";
import InlineCommentBox from "./InlineCommentBox";
import { useState } from "react";

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

export const gridCols = '190px 210px 120px 200px'

const FeedbackElement = ({ version, index, onClick, isSelected }: FeedbackElementProps) => {
  const isSpeech = version?.tags?.includes('speech');
  const isSong = version?.tags?.includes('song');
  const [selected, setSelected] = useState(false);

  return (
    <div
      className="relative group/feedback-element cursor-pointer border-b border-gray-500 px-2 py-1 flex flex-col gap-2 md:grid md:items-center md:gap-4 text-sm"
      style={{ gridTemplateColumns: `var(--md-grid, ${gridCols})` }}
    >
      <div className={`${isSelected ? 'text-primary' : ''} font-georgia text-base ${isSpeech ? 'italic' : ''}`} onClick={() => {setSelected(!selected); onClick();}}>
        {version?.songTitle}
      </div>
      <div className="flex flex-col gap-2 md:contents">
        <div className="flex items-center gap-2">
          <VoteWidget versionId={version?.id} songId={version?.songId} category="quality" hideVotes/>
        </div>
        <div className="flex items-center gap-2">
          {isSong && <VoteWidget versionId={version?.id} songId={version?.songId} category="singability" hideVotes/>}
        </div>
        <div className="flex items-center gap-2">
          <InlineCommentBox versionId={version?.id} />
        </div>
      </div>
    </div>
  );
};

export default FeedbackElement;

