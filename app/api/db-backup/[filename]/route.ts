import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { downloadBackup } from '@/lib/r2';

type RouteParams = { params: Promise<{ filename: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(request.url);
    const requestingUserId = searchParams.get('requestingUserId');
    const adminError = await requireAdmin(requestingUserId);
    if (adminError) return adminError;

    const { filename } = await params;
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const data = await downloadBackup(filename);
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Failed to download backup:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to download backup', details: message }, { status: 500 });
  }
}
