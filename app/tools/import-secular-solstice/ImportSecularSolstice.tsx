'use client';

import { useState } from 'react';
import { useUser } from '../../contexts/UserContext';

const ImportSecularSolstice = () => {
  const { canEdit } = useUser();
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState('');
  const [liveItems, setLiveItems] = useState<any[]>([]);

  const runImport = async () => {
    setIsRunning(true);
    setStatus('');
    setResult(null);
    setLiveItems([]);
    setProgress('Starting dry run...');
    const startedAt = performance.now();
    try {
      const response = await fetch('/api/admin/import-secular-solstice?dryRun=true&stream=true', { method: 'POST' });
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
              setProgress(`Done in ${Math.round(durationMs)}ms`);
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

  return (
    <div className="p-4 space-y-2">
      <button
        onClick={runImport}
        disabled={!canEdit || isRunning}
        className="text-xs px-2 py-1 bg-blue-600 text-white disabled:opacity-50"
      >
        {isRunning ? 'Importing...' : 'Import Secular Solstice'}
      </button>
      {progress && <div className="text-xs">{progress}</div>}
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
      {status && <pre className="text-xs whitespace-pre-wrap">{status}</pre>}
    </div>
  );
};

export default ImportSecularSolstice;
