import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSongBlobPrefix } from '@/lib/blobUtils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const movieFile = formData.get('movie') as File | null;
    const songId = formData.get('songId') as string | null;

    if (!movieFile) {
      return NextResponse.json({ error: 'No movie file provided' }, { status: 400 });
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
    return NextResponse.json({ error: 'Failed to upload slides movie' }, { status: 500 });
  }
}
