import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { updateProgramVideoUrl } from '@/lib/programsRepository';
import { getProgramBlobPrefix } from '@/lib/blobUtils';
import { getUsernameById } from '@/lib/usersRepository';

export async function POST(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id: programId} = await params;
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const userId = formData.get('userId') as string | null;

    if (!videoFile) {
      return NextResponse.json({error: 'No video file provided'}, {status: 400});
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({error: 'Blob storage token not configured'}, {status: 500});
    }

    const username = await getUsernameById(userId);
    const prefix = await getProgramBlobPrefix(programId);
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const blob = await put(`${prefix}/video-${Date.now()}.${videoFile.name.split('.').pop()}`, buffer, {access: 'public', contentType: videoFile.type, token});

    const updatedProgram = await updateProgramVideoUrl(programId, blob.url, username);

    return NextResponse.json({success: true, videoUrl: blob.url, program: updatedProgram});
  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json({error: 'Failed to upload video'}, {status: 500});
  }
}
