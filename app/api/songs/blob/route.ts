import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import path from 'path';

const MAX_FILE_SIZE_MB = 4.5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const songId = formData.get('songId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit` }, { status: 400 });
    }

    const token = process.env.secular_solstice__READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Blob storage token not configured' }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = path.extname(file.name).slice(1) || 'bin';
    const prefix = songId ? `song-${songId}` : 'song-unknown';
    const blob = await put(`${prefix}/blob-${Date.now()}.${extension}`, buffer, { access: 'public', contentType: file.type, token });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Error uploading blob:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
