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

const FeedbackElement = ({ version, index, onClick, isSelected }: FeedbackElementProps) => {
  const isSpeech = version?.tags?.includes('speech');
  const [selected, setSelected] = useState(false);

  return (
    <div
      className={`grid grid-cols-[180px_250px_150px_200px] relative group/feedback-element items-center gap-4 text-sm px-2 py-1 cursor-pointer border-b border-gray-500`}
    >
      <div className={`${isSelected ? 'text-primary' : ''} font-georgia text-base ${isSpeech ? 'italic' : ''}`} onClick={() => {setSelected(!selected); onClick();}}>
        {version?.songTitle}
      </div>
      <VoteWidget versionId={version?.id} songId={version?.songId} category="quality" hideVotes/>
      <VoteWidget versionId={version?.id} songId={version?.songId} category="singability" hideVotes/>
      <div className="col-span-1">
        <InlineCommentBox versionId={version?.id} />
      </div>
    </div>
  );
};

export default FeedbackElement;

