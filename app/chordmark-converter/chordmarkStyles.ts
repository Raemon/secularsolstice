export const CHORDMARK_STYLES = `
  .styled-chordmark .cmSong {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: pre;
    font-variant-ligatures: none;
  }
  .styled-chordmark.lyrics-wrap .cmSong {
    white-space: pre-wrap;
  }
  .styled-chordmark .cmSong * {
    font-family: inherit;
    white-space: inherit;
  }
  .styled-chordmark .cmSong p {
    margin: 0;
    line-height: 16px;
  }
  .styled-chordmark .cmSong .cmLine,
  .styled-chordmark .cmSong .cmChordLine,
  .styled-chordmark .cmSong .cmLyricLine,
  .styled-chordmark .cmSong .cmChordLyricLine,
  .styled-chordmark .cmSong .cmSectionLabel,
  .styled-chordmark .cmSong .cmEmptyLine {
    display: block;
    line-height: 16px;
  }
  .styled-chordmark .cmSong .cmChordLyricPair {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15em;
  }
  .styled-chordmark .cmSong .cmChordLineOffset,
  .styled-chordmark .cmSong .cmChordSymbol,
  .styled-chordmark .cmSong .cmChordDuration,
  .styled-chordmark .cmSong .cmBarSeparator,
  .styled-chordmark .cmSong .cmTimeSignature,
  .styled-chordmark .cmSong .cmSubBeatGroupOpener,
  .styled-chordmark .cmSong .cmSubBeatGroupCloser {
    white-space: inherit;
    color: #aaa;
  }
  .styled-chordmark .cmSong .cmSectionLabel {
    font-weight: 600;
  }
  .styled-chordmark .cmSong .cmEmptyLine {
    min-height: 0.5em;
  }
  .styled-chordmark .cmSong .cmBracketMeta {
    color: #888;
    font-style: italic;
    max-width: 400px;
    display: inline-block;
    width: 300px;
    white-space: pre-wrap;
  }
`;








