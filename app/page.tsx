import { redirect } from "next/navigation";
import SongPlayer from "./SongPlayer";

const songs = [
  {
    title: "Bold Orion",
    audioSrc: "./completeSolstice.mp3",
    lyricsFile: "./lyrics.md"
  }
]



export default function Home() {
  redirect('/songs');
  return (
    <div className="">
      {songs.map((song) => (
        <SongPlayer key={song.title} songTitle={song.title} audioSrc={song.audioSrc} lyricsMarkdownFile={song.lyricsFile} />
      ))}
    </div>
  );
}

