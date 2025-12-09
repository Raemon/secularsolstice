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
      className={`flex flex-wrap md:flex-nowrap relative group/feedback-element justify-start items-center gap-2 text-sm px-2 py-1 cursor-pointer w-[300px]] border-b border-gray-500`}
    >
      <div className={`${isSelected ? 'text-primary' : ''} flex-2 w-full md:w-[275px] font-georgia text-base ${isSpeech ? 'italic' : ''}`} onClick={() => {setSelected(!selected); onClick();}}>
        {version?.songTitle}
      </div>
      <div className="flex-1">
        <VoteWidget versionId={version?.id} songId={version?.songId} hideVotes/>
      </div>
      <div className="flex-1">
        <InlineCommentBox versionId={version?.id} />
      </div>
    </div>
  );
};

export default FeedbackElement;

