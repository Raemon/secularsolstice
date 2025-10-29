'use client'
import React, { useState, useEffect, useRef } from 'react';
// We can optionally import something from lodash if needed, e.g.:
// import map from 'lodash/map';

export const SongPlayer = ({
  songTitle,
  audioSrc = "song.mp3",
  lyricsMarkdownFile = ""
}: {
  songTitle: string;
  audioSrc?: string;
  lyricsMarkdownFile?: string
}) => {
  // This state tracks the lyrics content.
  const [lyricsContent, setLyricsContent] = useState("");

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (lyricsMarkdownFile) {
      fetch(lyricsMarkdownFile)
        .then((response) => response.text())
        .then((text) => {
          setLyricsContent(text);
        });
    }
  }, [lyricsMarkdownFile]);

  useEffect(() => {
    const audio = audioRef.current;
    const lyricsContainer = lyricsContainerRef.current;

    if (audio && lyricsContainer) {
      const handleTimeUpdate = () => {
        const { currentTime, duration } = audio;
        const { scrollHeight, clientHeight } = lyricsContainer;

        const maxScrollTop = scrollHeight - clientHeight;
        const scrollTop = (currentTime / duration) * maxScrollTop - clientHeight

        lyricsContainer.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [lyricsContent]);

  return (
    <div className="w-screen h-screen bg-black relative">
      <audio ref={audioRef} controls src={audioSrc} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[50vw]">
        Your browser does not support the audio element.
      </audio>
      <div
        ref={lyricsContainerRef}
        style={{
          position: 'relative',
          height: "100vh",
          overflow: "hidden",
          border: "1px solid #ccc",
          // background: "linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.7))",
          zIndex: 0
        }}
      >
        {/* Translucent rectangle over the middle */}
        {/* <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: '100%',
            height: '50px',
            transform: 'translateY(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
        ></div> */}
        <div className="whitespace-pre-wrap text-white translate-x-[calc(50%-120px)]">
          <div className="h-[50vh] transition-all duration-300"></div>
          {lyricsContent}
        </div>
      </div>
    </div>
  );
};

export default SongPlayer;