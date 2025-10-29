import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const songName = searchParams.get('song');
    const fileName = searchParams.get('file');
    const binary = searchParams.get('binary');

    const songsDir = path.join(process.cwd(), 'songs');

    // If requesting specific file content
    if (songName && fileName) {
      const filePath = path.join(songsDir, songName, fileName);
      try {
        const lowerFileName = fileName.toLowerCase();
        const isAudioFile = ['.mp3', '.wav', '.aiff', '.aif', '.ogg', '.flac', '.m4a', '.aac', '.wma'].some(ext => lowerFileName.endsWith(ext));
        const isPDFFile = lowerFileName.endsWith('.pdf');
        
        // For audio files, return with appropriate content type
        if (isAudioFile) {
          const content = await fs.readFile(filePath);
          const contentTypeMap: { [key: string]: string } = {
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.aiff': 'audio/aiff',
            '.aif': 'audio/aiff',
            '.ogg': 'audio/ogg',
            '.flac': 'audio/flac',
            '.m4a': 'audio/mp4',
            '.aac': 'audio/aac',
            '.wma': 'audio/x-ms-wma',
          };
          const ext = Object.keys(contentTypeMap).find(e => lowerFileName.endsWith(e));
          const contentType = ext ? contentTypeMap[ext] : 'audio/mpeg';
          
          return new NextResponse(content.buffer as ArrayBuffer, {
            headers: {
              'Content-Type': contentType,
              'Accept-Ranges': 'bytes',
            },
          });
        }
        // For PDF files, return with PDF content type
        if (isPDFFile) {
          const content = await fs.readFile(filePath);
          return new NextResponse(content.buffer as ArrayBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
            },
          });
        }
        // For binary files (like .mscz), return as blob
        if (binary === 'true' || fileName.toLowerCase().endsWith('.mscz')) {
          const content = await fs.readFile(filePath);
          return new NextResponse(content.buffer as ArrayBuffer, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `attachment; filename="${fileName}"`,
            },
          });
        }
        // For text files, return as JSON
        const content = await fs.readFile(filePath, 'utf-8');
        return NextResponse.json({ content });
      } catch {
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
          const filteredFiles = await Promise.all(
            files
              .filter(file => {
                if (!file.isFile()) return false;
                const name = file.name.toLowerCase();
                return name !== 'readme.md' && name !== 'makefile';
              })
              .map(async (file) => {
                const filePath = path.join(songDir, file.name);
                const stats = await fs.stat(filePath);
                return { name: file.name, size: stats.size, mtime: stats.mtime.toISOString() };
              })
          );

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

