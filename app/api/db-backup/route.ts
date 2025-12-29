import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { listBackups, type BackupInfo } from '@/lib/r2';

export type DbBackupListResponse = {
  backups: BackupInfo[];
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestingUserId = searchParams.get('requestingUserId');
    const adminError = await requireAdmin(requestingUserId);
    if (adminError) return adminError;

    const backups = await listBackups();
    return NextResponse.json({ backups } satisfies DbBackupListResponse);
  } catch (error) {
    console.error('Failed to list backups:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to list backups', details: message }, { status: 500 });
  }
}
