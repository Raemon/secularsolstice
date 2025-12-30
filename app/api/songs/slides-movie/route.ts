import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSongBlobPrefix } from '@/lib/blobUtils';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const movieFile = formData.get('movie') as File | null;
    const songId = formData.get('songId') as string | null;

    if (!movieFile) {
      return NextResponse.json({ error: 'No movie file provided' }, { status: 400 });
    }

    if (movieFile.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (movieFile.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json({ error: `Movie file size (${sizeMB}MB) exceeds ${MAX_FILE_SIZE_MB}MB limit` }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Blob storage token not configured' }, { status: 500 });
    }

    const prefix = await getSongBlobPrefix(songId);
    const buffer = Buffer.from(await movieFile.arrayBuffer());
    const extension = movieFile.name.includes('.') ? movieFile.name.split('.').pop() : 'mp4';
    const blob = await put(`${prefix}/slides-movie-${Date.now()}.${extension}`, buffer, { access: 'public', contentType: movieFile.type, token });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Error uploading slides movie:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload slides movie';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
