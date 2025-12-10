'use client';

import ChordmarkRenderer from '@/app/chordmark-converter/ChordmarkRenderer';

const ScriptSongRenderer = ({content}: {content: string}) => {
  return (
    <div className="styled-chordmark lyrics-wrap text-xs font-mono">
      <ChordmarkRenderer 
        content={content}
        defaultMode="lyrics"
        print={true}
      />
    </div>
  );
};

export default ScriptSongRenderer;

