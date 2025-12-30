import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { validateBearerSecret } from '@/lib/authUtils';
import { importFromDirectories } from '@/lib/importUtils';
import { downloadSecularSolsticeRepo } from '@/lib/githubDownloader';

// Allow up to 5 minutes for import (Vercel Pro limit)
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let cleanup: (() => Promise<void>) | null = null;
  try {
    const url = new URL(request.url);
    // Check for import secret (for GitHub Actions) or admin auth
    const hasValidSecret = validateBearerSecret(request, process.env.IMPORT_SECRET);
    if (!hasValidSecret) {
      const authError = await requireAdmin(url.searchParams.get('requestingUserId'));
      if (authError) return authError;
    }
    const dryRun = url.searchParams.get('dryRun') === 'true';
    const stream = url.searchParams.get('stream') === 'true';

    // Download and extract the SecularSolstice repo from GitHub
    const repo = await downloadSecularSolsticeRepo();
    cleanup = repo.cleanup;

    // Parse which types to import (default: all)
    const importTypes = url.searchParams.get('types')?.split(',') || ['songs', 'speeches', 'activities', 'programs', 'resync'];

    const config = {
      songsDirs: importTypes.includes('songs') ? [{ path: repo.songsDir, tags: ['song'] }] : [],
      speechesDirs: importTypes.includes('speeches') ? [repo.speechesDir] : [],
      programsDirs: (importTypes.includes('programs') || importTypes.includes('resync')) ? [repo.listsDir] : [],
      activitiesConfig: importTypes.includes('activities') ? { listFile: repo.activitiesListFile, speechesDir: repo.speechesDir } : undefined,
    };

    if (stream) {
      const encoder = new TextEncoder();
      const streamBody = new ReadableStream({
        async start(controller) {
          const send = (data: unknown) => controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
          try {
            const { songResults, speechResults, activityResults, programResults, resyncResults } = await importFromDirectories(
              config,
              dryRun,
              (type, result) => {
                // Filter out resync if not requested
                if (type === 'resync' && !importTypes.includes('resync')) return;
                // Filter out programs if only resync requested
                if (type === 'program' && !importTypes.includes('programs')) return;
                // Filter out activities if not requested
                if (type === 'activity' && !importTypes.includes('activities')) return;
                send({ type, ...result });
              }
            );
            const filteredResyncResults = importTypes.includes('resync') ? resyncResults : [];
            const filteredProgramResults = importTypes.includes('programs') ? programResults : [];
            const filteredActivityResults = importTypes.includes('activities') ? activityResults : [];
            send({ type: 'summary', speechResults, songResults, activityResults: filteredActivityResults, programResults: filteredProgramResults, resyncResults: filteredResyncResults });
          } catch (error) {
            send({ type: 'error', error: error instanceof Error ? error.message : 'Failed to import content' });
          } finally {
            await repo.cleanup();
            controller.close();
          }
        },
      });

      return new Response(streamBody, { headers: { 'Content-Type': 'application/x-ndjson' } });
    }

    const { songResults, speechResults, activityResults, programResults, resyncResults } = await importFromDirectories(config, dryRun);
    await repo.cleanup();
    const filteredResyncResults = importTypes.includes('resync') ? resyncResults : [];
    const filteredProgramResults = importTypes.includes('programs') ? programResults : [];
    const filteredActivityResults = importTypes.includes('activities') ? activityResults : [];
    return NextResponse.json({ speechResults, songResults, activityResults: filteredActivityResults, programResults: filteredProgramResults, resyncResults: filteredResyncResults });
  } catch (error) {
    if (cleanup) await cleanup();
    const message = error instanceof Error ? error.message : 'Failed to import content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}