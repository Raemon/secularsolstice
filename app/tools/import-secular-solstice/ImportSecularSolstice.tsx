'use client';

import { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { detectFileType } from '@/lib/lyricsExtractor';

const ImportSecularSolstice = () => {
  const { canEdit } = useUser();
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState('');
  const [liveItems, setLiveItems] = useState<any[]>([]);
  const [isRenderingLilypond, setIsRenderingLilypond] = useState(false);
  const [lilypondStatus, setLilypondStatus] = useState('');
  const [lilypondResults, setLilypondResults] = useState<any[]>([]);

  const runWithLimit = async <T,>(items: T[], limit: number, worker: (item: T) => Promise<void>) => {
    const executing: Promise<void>[] = [];
    for (const item of items) {
      const p = Promise.resolve().then(() => worker(item)).finally(() => {
        const idx = executing.indexOf(p);
        if (idx >= 0) {
          executing.splice(idx, 1);
        }
      });
      executing.push(p);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
    await Promise.all(executing);
  };

  const runImport = async (dryRun: boolean) => {
    setIsRunning(true);
    setStatus('');
    setResult(null);
    setLiveItems([]);
    setProgress(dryRun ? 'Starting dry run...' : 'Starting import...');
    const startedAt = performance.now();
    try {
      const response = await fetch(`/api/admin/import-secular-solstice?dryRun=${dryRun ? 'true' : 'false'}&stream=true`, { method: 'POST' });
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
              setResult({ speechResults: parsed.speechResults, songResults: parsed.songResults });
              const durationMs = performance.now() - startedAt;
              setProgress(`${dryRun ? 'Dry run' : 'Import'} done in ${Math.round(durationMs)}ms`);
            } else if (parsed.type === 'speech' || parsed.type === 'song') {
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
            setResult({ speechResults: parsed.speechResults, songResults: parsed.songResults });
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

  return (
    <div className="p-4 space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => runImport(true)}
          disabled={!canEdit || isRunning}
          className="text-xs px-2 py-1 bg-blue-600 text-white disabled:opacity-50"
        >
          {isRunning ? 'Working...' : 'Dry run'}
        </button>
        <button
          onClick={() => runImport(false)}
          disabled={!canEdit || isRunning}
          className="text-xs px-2 py-1 bg-blue-600 text-white disabled:opacity-50"
        >
          {isRunning ? 'Working...' : 'Import for real'}
        </button>
        <button
          onClick={renderMissingLilypond}
          disabled={!canEdit || isRunning || isRenderingLilypond}
          className="text-xs px-2 py-1 bg-blue-600 text-white disabled:opacity-50"
        >
          {isRenderingLilypond ? 'Rendering...' : 'Render missing lilypond'}
        </button>
      </div>
      {progress && <div className="text-xs">{progress}</div>}
      {lilypondStatus && <div className="text-xs">{lilypondStatus}</div>}
      {liveItems.length > 0 && (
        <ul className="text-xs list-disc list-inside space-y-0.5">
          {liveItems.map((r, index) => (
            <li key={`${r.title}-${r.label}-${r.status}-${index}`}>
              {r.type}: {r.title} / {r.label} - {r.status}{' '}
              {r.url && (
                <a className="underline text-blue-600" href={r.url} target="_blank" rel="noreferrer">open</a>
              )}
            </li>
          ))}
        </ul>
      )}
      {result && (
        <div className="text-xs space-y-1">
          <div>Speech results ({result.speechResults?.length ?? 0})</div>
          <ul className="list-disc list-inside space-y-0.5">
            {result.speechResults?.map((r: any, index: number) => (
              <li key={`${r.title}-${r.label}-${index}`}>
                {r.title} / {r.label} - {r.status}{' '}
                {r.url && (
                  <a className="underline text-blue-600" href={r.url} target="_blank" rel="noreferrer">open</a>
                )}
              </li>
            ))}
          </ul>
          <div>Song results ({result.songResults?.length ?? 0})</div>
          <ul className="list-disc list-inside space-y-0.5">
            {result.songResults?.map((r: any, index: number) => (
              <li key={`${r.title}-${r.label}-${index}`}>
                {r.title} / {r.label} - {r.status}{' '}
                {r.url && (
                  <a className="underline" href={r.url} target="_blank" rel="noreferrer">open</a>
                )}
              </li>
            ))}
          </ul>
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
