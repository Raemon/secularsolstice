'use client';

import { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { detectFileType } from '@/lib/lyricsExtractor';
import { runWithLimit } from '@/lib/asyncUtils';

type ImportResult = { title: string; label: string; status: string; url?: string; error?: string };
type ProgramImportResult = { title: string; status: string; url?: string; error?: string; elementCount?: number; missingElements?: string[]; createdPlaceholders?: string[] };
type ResyncResult = { title: string; status: string; url?: string; error?: string; addedElements?: number; createdPlaceholders?: string[] };
type LiveItem = { type: 'song' | 'speech' | 'activity' | 'program' | 'resync'; title: string; label?: string; status: string; url?: string; elementCount?: number; missingElements?: string[]; addedElements?: number; createdPlaceholders?: string[] };
type ImportResults = { speechResults: ImportResult[]; songResults: ImportResult[]; activityResults: ImportResult[]; programResults: ProgramImportResult[]; resyncResults: ResyncResult[] };
type ImportType = 'songs' | 'speeches' | 'activities' | 'programs' | 'resync';

const ImportSecularSolstice = () => {
  const { userId, isAdmin, loading: userLoading } = useUser();
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<ImportResults | null>(null);
  const [progress, setProgress] = useState('');
  const [liveItems, setLiveItems] = useState<LiveItem[]>([]);
  const [isRenderingLilypond, setIsRenderingLilypond] = useState(false);
  const [lilypondStatus, setLilypondStatus] = useState('');
  const [lilypondResults, setLilypondResults] = useState<any[]>([]);

  const runImport = async (dryRun: boolean, types?: ImportType[]) => {
    setIsRunning(true);
    setStatus('');
    setResult(null);
    setLiveItems([]);
    const typeLabel = types ? types.join(', ') : 'all';
    setProgress(dryRun ? `Starting dry run for ${typeLabel}...` : `Starting import for ${typeLabel}...`);
    const startedAt = performance.now();
    try {
      const typesParam = types ? `&types=${types.join(',')}` : '';
      const response = await fetch(`/api/admin/import-secular-solstice?dryRun=${dryRun ? 'true' : 'false'}&stream=true&requestingUserId=${userId}${typesParam}`, { method: 'POST' });
      if (!response.body) {
        setStatus('No response body');
        return;
      }
      setProgress('Streaming results...');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      let count = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split('\n');
        pending = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'summary') {
              setResult({ speechResults: parsed.speechResults, songResults: parsed.songResults, activityResults: parsed.activityResults, programResults: parsed.programResults, resyncResults: parsed.resyncResults });
              const durationMs = performance.now() - startedAt;
              setProgress(`${dryRun ? 'Dry run' : 'Import'} done in ${Math.round(durationMs)}ms`);
            } else if (parsed.type === 'speech' || parsed.type === 'song' || parsed.type === 'activity' || parsed.type === 'program' || parsed.type === 'resync') {
              count += 1;
              setLiveItems((prev) => [...prev, parsed]);
              setProgress(`Received ${count} items...`);
            } else if (parsed.type === 'error') {
              setStatus(parsed.error || 'Import failed');
            }
          } catch (parseError) {
            setStatus('Failed to parse stream');
          }
        }
      }
      if (pending.trim()) {
        try {
          const parsed = JSON.parse(pending);
          if (parsed.type === 'summary') {
            setResult({ speechResults: parsed.speechResults, songResults: parsed.songResults, activityResults: parsed.activityResults, programResults: parsed.programResults, resyncResults: parsed.resyncResults });
          }
        } catch (_err) {
          setStatus('Failed to parse trailing stream data');
        }
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const renderMissingLilypond = async () => {
    setIsRenderingLilypond(true);
    setLilypondStatus('Loading songs...');
    setLilypondResults([]);
    try {
      const songsResponse = await fetch('/api/songs');
      if (!songsResponse.ok) {
        setLilypondStatus('Failed to load songs');
        return;
      }
      const songsData = await songsResponse.json();
      const songs = songsData.songs || [];
      const candidates: { version: any; songTitle: string }[] = [];
      for (const song of songs) {
        const songTitle = song.title || '';
        const versions = song.versions || [];
        for (const version of versions) {
          const fileType = detectFileType(version.label || '', version.content || '');
          const hasRendered = Boolean(version.renderedContent && version.renderedContent.lilypond);
          if (fileType === 'lilypond' && version.content && !hasRendered) {
            candidates.push({ version, songTitle });
          }
        }
      }
      if (candidates.length === 0) {
        setLilypondStatus('No missing lilypond renders found');
        return;
      }
      let completed = 0;
      await runWithLimit(candidates, 3, async ({ version, songTitle }) => {
        setLilypondStatus(`Rendering ${songTitle} / ${version.label} (${completed + 1}/${candidates.length})`);
        try {
          const formData = new FormData();
          formData.append('content', version.content);
          const renderResponse = await fetch('/api/lilypond-to-svg', {
            method: 'POST',
            body: formData,
          });
          if (!renderResponse.ok) {
            const errorText = await renderResponse.text();
            throw new Error(errorText || 'Failed to render lilypond');
          }
          const renderData = await renderResponse.json();
          const svgs = renderData.svgs || [];
          const renderedContent = { ...(version.renderedContent || {}), lilypond: JSON.stringify(svgs) };
          await fetch(`/api/songs/versions/${version.id}/rendered-content`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ renderedContent }),
          });
          completed += 1;
          setLilypondResults((prev) => [...prev, { songTitle, label: version.label, status: 'rendered', pages: svgs.length }]);
        } catch (error) {
          completed += 1;
          setLilypondResults((prev) => [...prev, { songTitle, label: version.label, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }]);
        }
      });
      setLilypondStatus(`Finished rendering ${completed}/${candidates.length} versions`);
    } catch (error) {
      setLilypondStatus(error instanceof Error ? error.message : 'Failed to render lilypond');
    } finally {
      setIsRenderingLilypond(false);
    }
  };

  if (userLoading) {
    return <div className="p-4 text-gray-400">Loading...</div>;
  }

  if (!isAdmin) {
    return <div className="p-4 text-gray-400">You must be an admin to use this tool.</div>;
  }

  const ImportButton = ({ types, label }: { types?: ImportType[]; label: string }) => (
    <div className="flex gap-1">
      <button onClick={() => runImport(true, types)} disabled={!isAdmin || isRunning} className="text-xs px-2 py-0.5 bg-gray-600 text-white disabled:opacity-50">
        {isRunning ? '...' : `${label} (dry)`}
      </button>
      <button onClick={() => runImport(false, types)} disabled={!isAdmin || isRunning} className="text-xs px-2 py-0.5 bg-blue-600 text-white disabled:opacity-50">
        {isRunning ? '...' : label}
      </button>
    </div>
  );

  return (
    <div className="p-4 space-y-2">
      <div className="flex flex-wrap gap-2">
        <ImportButton label="All" />
        <ImportButton types={['songs']} label="Songs" />
        <ImportButton types={['speeches']} label="Speeches" />
        <ImportButton types={['activities']} label="Activities" />
        <ImportButton types={['programs']} label="Programs" />
        <ImportButton types={['resync']} label="Resync" />
        <button onClick={renderMissingLilypond} disabled={!isAdmin || isRunning || isRenderingLilypond} className="text-xs px-2 py-0.5 bg-purple-600 text-white disabled:opacity-50">
          {isRenderingLilypond ? 'Rendering...' : 'Render Lilypond'}
        </button>
      </div>
      {progress && <div className="text-xs">{progress}</div>}
      {lilypondStatus && <div className="text-xs">{lilypondStatus}</div>}
      {liveItems.length > 0 && (
        <ul className="text-xs list-disc list-inside space-y-0.5">
          {isRunning && liveItems.length > 0 && (
            <li key="current-considering" className="text-gray-400">
              considering: {liveItems[liveItems.length - 1].type}: {liveItems[liveItems.length - 1].title}
              {liveItems[liveItems.length - 1].label ? ` / ${liveItems[liveItems.length - 1].label}` : ''} - {liveItems[liveItems.length - 1].status}
            </li>
          )}
          {[...liveItems].reverse().filter(r => r.status !== 'exists').map((r, index) => (
            <li key={`${r.title}-${r.label || ''}-${r.status}-${index}`}>
              {r.type}: {r.title}{r.label ? ` / ${r.label}` : ''} - {r.status}{r.elementCount ? ` (${r.elementCount} elements)` : ''}{r.addedElements ? ` (+${r.addedElements} elements)` : ''}{' '}
              {r.missingElements && r.missingElements.length > 0 && <span className="text-yellow-500">[missing: {r.missingElements.join(', ')}]</span>}
              {r.createdPlaceholders && r.createdPlaceholders.length > 0 && <span className="text-orange-400">[placeholders: {r.createdPlaceholders.join(', ')}]</span>}
              {r.url && (
                <a className="underline text-blue-600" href={r.url} target="_blank" rel="noreferrer">open</a>
              )}
            </li>
          ))}
        </ul>
      )}
      {result && (
        <div className="text-xs space-y-1">
          {(result.speechResults?.filter(r => r.status !== 'exists').length ?? 0) > 0 && (<>
            <div>Speeches to import ({result.speechResults?.filter(r => r.status !== 'exists').length})</div>
            <ul className="list-disc list-inside space-y-0.5">
              {result.speechResults?.filter(r => r.status !== 'exists').map((r, index) => (
                <li key={`${r.title}-${r.label}-${index}`}>
                  {r.title} / {r.label} - {r.status}{' '}
                  {r.url && (<a className="underline text-blue-600" href={r.url} target="_blank" rel="noreferrer">open</a>)}
                </li>
              ))}
            </ul>
          </>)}
          {(result.songResults?.filter(r => r.status !== 'exists').length ?? 0) > 0 && (<>
            <div>Songs to import ({result.songResults?.filter(r => r.status !== 'exists').length})</div>
            <ul className="list-disc list-inside space-y-0.5">
              {result.songResults?.filter(r => r.status !== 'exists').map((r, index) => (
                <li key={`${r.title}-${r.label}-${index}`}>
                  {r.title} / {r.label} - {r.status}{' '}
                  {r.url && (<a className="underline" href={r.url} target="_blank" rel="noreferrer">open</a>)}
                </li>
              ))}
            </ul>
          </>)}
          {(result.activityResults?.filter(r => r.status !== 'exists').length ?? 0) > 0 && (<>
            <div>Activities to import ({result.activityResults?.filter(r => r.status !== 'exists').length})</div>
            <ul className="list-disc list-inside space-y-0.5">
              {result.activityResults?.filter(r => r.status !== 'exists').map((r, index) => (
                <li key={`activity-${r.title}-${r.label}-${index}`}>
                  {r.title} / {r.label} - {r.status}{' '}
                  {r.url && (<a className="underline text-blue-600" href={r.url} target="_blank" rel="noreferrer">open</a>)}
                </li>
              ))}
            </ul>
          </>)}
          {(result.programResults?.filter(r => r.status !== 'exists').length ?? 0) > 0 && (<>
            <div>Programs to import ({result.programResults?.filter(r => r.status !== 'exists').length})</div>
            <ul className="list-disc list-inside space-y-0.5">
              {result.programResults?.filter(r => r.status !== 'exists').map((r, index) => (
                <li key={`${r.title}-${index}`}>
                  {r.title} - {r.status}{r.elementCount ? ` (${r.elementCount} elements)` : ''}{' '}
                  {r.missingElements && r.missingElements.length > 0 && <span className="text-yellow-500">[missing: {r.missingElements.join(', ')}]</span>}
                  {r.createdPlaceholders && r.createdPlaceholders.length > 0 && <span className="text-orange-400">[placeholders: {r.createdPlaceholders.join(', ')}]</span>}
                  {r.url && (<a className="underline text-blue-600" href={r.url} target="_blank" rel="noreferrer">open</a>)}
                </li>
              ))}
            </ul>
          </>)}
          {(result.resyncResults?.length ?? 0) > 0 && (<>
            <div>Programs resynced ({result.resyncResults?.length})</div>
            <ul className="list-disc list-inside space-y-0.5">
              {result.resyncResults?.map((r, index) => (
                <li key={`resync-${r.title}-${index}`}>
                  {r.title} - {r.status}{r.addedElements ? ` (+${r.addedElements} elements)` : ''}{' '}
                  {r.createdPlaceholders && r.createdPlaceholders.length > 0 && <span className="text-orange-400">[placeholders: {r.createdPlaceholders.join(', ')}]</span>}
                  {r.url && (<a className="underline text-blue-600" href={r.url} target="_blank" rel="noreferrer">open</a>)}
                </li>
              ))}
            </ul>
          </>)}
          {(result.speechResults?.filter(r => r.status !== 'exists').length ?? 0) === 0 &&
           (result.songResults?.filter(r => r.status !== 'exists').length ?? 0) === 0 &&
           (result.activityResults?.filter(r => r.status !== 'exists').length ?? 0) === 0 &&
           (result.programResults?.filter(r => r.status !== 'exists').length ?? 0) === 0 &&
           (result.resyncResults?.length ?? 0) === 0 && (
            <div>Nothing to import - all items already exist</div>
          )}
        </div>
      )}
      {lilypondResults.length > 0 && (
        <ul className="text-xs list-disc list-inside space-y-0.5">
          {lilypondResults.map((item, index) => (
            <li key={`${item.songTitle}-${item.label}-${item.status}-${index}`}>
              lilypond: {item.songTitle} / {item.label} - {item.status}{item.pages ? ` (${item.pages} pages)` : ''}{' '}
              {item.error && <span>{item.error}</span>}
            </li>
          ))}
        </ul>
      )}
      {status && <pre className="text-xs whitespace-pre-wrap">{status}</pre>}
    </div>
  );
};

export default ImportSecularSolstice;
