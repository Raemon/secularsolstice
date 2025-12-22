import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET() {
  try {
    const token = process.env.secular_solstice__READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Blob storage token not configured' }, { status: 500 });
    }

    const allBlobs: { pathname: string; url: string; size: number; uploadedAt: Date }[] = [];
    let cursor: string | undefined;

    do {
      const result = await list({ token, cursor, limit: 1000 });
      allBlobs.push(...result.blobs.map(b => ({
        pathname: b.pathname,
        url: b.url,
        size: b.size,
        uploadedAt: b.uploadedAt
      })));
      cursor = result.cursor;
    } while (cursor);

    return NextResponse.json({ blobs: allBlobs });
  } catch (error) {
    console.error('Error listing blobs:', error);
    return NextResponse.json({ error: 'Failed to list blobs' }, { status: 500 });
  }
}
