import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const songName = searchParams.get('song');
    const fileName = searchParams.get('file');

    const songsDir = path.join(process.cwd(), 'songs');

    // If requesting specific file content
    if (songName && fileName) {
      const filePath = path.join(songsDir, songName, fileName);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return NextResponse.json({ content });
      } catch (error) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
    }

    // Otherwise, list all songs and their files
    const entries = await fs.readdir(songsDir, { withFileTypes: true });
    const songs = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const songDir = path.join(songsDir, entry.name);
        try {
          const files = await fs.readdir(songDir, { withFileTypes: true });
          const filteredFiles = files
            .filter(file => {
              if (!file.isFile()) return false;
              const name = file.name.toLowerCase();
              return name !== 'readme.md' && name !== 'makefile';
            })
            .map(file => file.name);

          if (filteredFiles.length > 0) {
            songs.push({
              name: entry.name,
              files: filteredFiles
            });
          }
        } catch (error) {
          console.error(`Error reading directory ${entry.name}:`, error);
        }
      }
    }

    return NextResponse.json({ songs });
  } catch (error) {
    console.error('Error reading songs directory:', error);
    return NextResponse.json({ error: 'Failed to read songs directory' }, { status: 500 });
  }
}

