import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { updateProgramVideoUrl } from '@/lib/programsRepository';

export async function POST(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id: programId} = await params;
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;

    if (!videoFile) {
      return NextResponse.json({error: 'No video file provided'}, {status: 400});
    }

    const token = process.env.secular_solstice__READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({error: 'Blob storage token not configured'}, {status: 500});
    }

    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const blob = await put(`program-${programId}/video-${Date.now()}.${videoFile.name.split('.').pop()}`, buffer, {access: 'public', contentType: videoFile.type, token});

    const updatedProgram = await updateProgramVideoUrl(programId, blob.url);

    return NextResponse.json({success: true, videoUrl: blob.url, program: updatedProgram});
  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json({error: 'Failed to upload video'}, {status: 500});
  }
}

