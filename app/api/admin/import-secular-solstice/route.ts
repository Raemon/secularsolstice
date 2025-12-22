import path from 'path';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { importFromDirectories } from '@/lib/importUtils';

const SECULAR_ROOT = path.join(process.cwd(), 'SecularSolstice.github.io-master');
const SONGS_DIR = path.join(process.cwd(), 'songs');

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const authError = await requireAdmin(url.searchParams.get('requestingUserId'));
    if (authError) return authError;
    const dryRun = url.searchParams.get('dryRun') === 'true';
    const stream = url.searchParams.get('stream') === 'true';

    const config = {
      songsDirs: [
        { path: SONGS_DIR, tags: ['song'] },
        { path: path.join(SECULAR_ROOT, 'songs'), tags: ['song', 'secular-solstice'] },
      ],
      speechesDirs: [path.join(SECULAR_ROOT, 'speeches')],
    };

    if (stream) {
      const encoder = new TextEncoder();
      const streamBody = new ReadableStream({
        async start(controller) {
          const send = (data: unknown) => controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
          try {
            const { songResults, speechResults } = await importFromDirectories(
              config,
              dryRun,
              (type, result) => send({ type, ...result })
            );
            send({ type: 'summary', speechResults, songResults });
          } catch (error) {
            send({ type: 'error', error: error instanceof Error ? error.message : 'Failed to import content' });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(streamBody, { headers: { 'Content-Type': 'application/x-ndjson' } });
    }

    const { songResults, speechResults } = await importFromDirectories(config, dryRun);
    return NextResponse.json({ speechResults, songResults });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}