import { NextRequest, NextResponse } from 'next/server';
import { listSongsWithAllVersions } from '@/lib/songsRepository';
import { listPrograms } from '@/lib/programsRepository';
import { generateFullExportBuffer } from '@/lib/exportUtils';
import { requireAdmin } from '@/lib/adminAuth';
import { validateBearerSecret } from '@/lib/authUtils';

// Increase timeout for backup operation (fetches all songs + downloads blobs)
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Check for backup secret (for GitHub Actions) or admin auth
    const hasValidSecret = validateBearerSecret(request, process.env.BACKUP_SECRET);
    if (!hasValidSecret) {
      const { searchParams } = new URL(request.url);
      const requestingUserId = searchParams.get('requestingUserId');
      const adminError = await requireAdmin(requestingUserId);
      if (adminError) return adminError;
    }

    const [songs, programs] = await Promise.all([
      listSongsWithAllVersions(),
      listPrograms()
    ]);
    if (!songs.length) {
      return NextResponse.json({ error: 'No songs available to backup' }, { status: 400 });
    }

    const buffer = await generateFullExportBuffer(songs, programs);
    const date = new Date().toISOString().split('T')[0];
    const filename = `songs-export-${date}.zip`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Backup-Filename': filename,
        'X-Songs-Count': String(songs.length),
        'X-Versions-Count': String(songs.reduce((acc, s) => acc + s.versions.length, 0)),
        'X-Programs-Count': String(programs.length),
      },
    });
  } catch (error) {
    console.error('Backup failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Backup failed', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 },
    );
  }
}