import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    lilypondServerUrl: process.env.NEXT_PUBLIC_LILYPOND_SERVER_URL || null,
  });
}
