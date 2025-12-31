'use client';

import { useState, useEffect } from 'react';
import LilypondViewer from '../songs/LilypondViewer';

type LyVersion = {
  songTitle: string;
  versionId: string;
  label: string;
  hasContent: boolean;
  hasBlobUrl: boolean;
  content: string | null;
  blobUrl: string | null;
};

const TestLilypondPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lyContent, setLyContent] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [lyVersions, setLyVersions] = useState<LyVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(true);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    const fetchLyVersions = async () => {
      try {
        const response = await fetch('/api/songs');
        if (!response.ok) throw new Error('Failed to fetch songs');
        const data = await response.json();
        const songs = data.songs || [];
        const versions: LyVersion[] = [];
        for (const song of songs) {
          for (const version of song.versions || []) {
            if (version.label?.endsWith('.ly')) {
              versions.push({
                songTitle: song.title,
                versionId: version.id,
                label: version.label,
                hasContent: !!version.content,
                hasBlobUrl: !!version.blobUrl,
                content: version.content,
                blobUrl: version.blobUrl,
              });
            }
          }
        }
        setLyVersions(versions);
      } catch (err) {
        console.error('Failed to fetch ly versions:', err);
      } finally {
        setLoadingVersions(false);
      }
    };
    fetchLyVersions();
  }, []);

  const testSimple = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLyContent(null);
    setLogs([]);

    const simpleLilypond = `\\version "2.18.2"
\\header {
  title = "Test Song"
}
{
  c' d' e' f' g' a' b' c''
}`;

    try {
      const lilypondServerUrl = process.env.NEXT_PUBLIC_LILYPOND_SERVER_URL;
      const endpoint = lilypondServerUrl 
        ? `${lilypondServerUrl}/convert`
        : '/api/lilypond-to-svg';
      const isExternalServer = !!lilypondServerUrl;

      addLog(`Using endpoint: ${endpoint} (external: ${isExternalServer})`);
      const response = await fetch(endpoint, {
        method: 'POST',
        ...(isExternalServer 
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: simpleLilypond }) }
          : { body: (() => { const fd = new FormData(); fd.append('content', simpleLilypond); return fd; })() }
        ),
      });

      addLog(`Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const responseText = await response.text();
        addLog(`Error response: ${responseText.substring(0, 200)}`);
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          setError(`Server error (${response.status}): ${responseText.substring(0, 200)}`);
          return;
        }
        setError(`API Error: ${errorData.error} - ${errorData.details || ''}`);
      } else {
        const data = await response.json();
        addLog(`Success! ${data.pageCount} pages generated`);
        setResult(data);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Exception: ${errMsg}`);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const findLilypondVersion = async (): Promise<{songTitle: string, label: string, content: string} | null> => {
    addLog('Searching for a song version with lilypond content...');
    const songsResponse = await fetch('/api/songs?limit=50');
    if (!songsResponse.ok) throw new Error('Failed to fetch songs list');
    const songsData = await songsResponse.json();
    const songs = songsData.songs || [];
    addLog(`Found ${songs.length} songs`);
    
    const lyVersions: {song: string, label: string, hasContent: boolean, hasBlobUrl: boolean}[] = [];
    for (const song of songs) {
      const versions = song.versions || [];
      for (const version of versions) {
        if (version.label?.endsWith('.ly')) {
          lyVersions.push({song: song.title, label: version.label, hasContent: !!version.content, hasBlobUrl: !!version.blobUrl});
          if (version.content) {
            addLog(`Found with content: ${song.title} / ${version.label}`);
            return { songTitle: song.title, label: version.label, content: version.content };
          }
        }
      }
    }
    if (lyVersions.length > 0) {
      addLog(`Found ${lyVersions.length} .ly versions but none have content:`);
      lyVersions.slice(0, 5).forEach(v => addLog(`  - ${v.song}/${v.label} (content: ${v.hasContent}, blobUrl: ${v.hasBlobUrl})`));
    }
    return null;
  };

  const testFromFile = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLyContent(null);
    setLogs([]);

    try {
      const lyVersion = await findLilypondVersion();
      if (!lyVersion) throw new Error('No .ly file found in database. Import a song with a .ly version first.');
      
      const lilypondContent = lyVersion.content;
      addLog(`Using ${lyVersion.songTitle}/${lyVersion.label} (${lilypondContent.length} bytes)`);

      const lilypondServerUrl = process.env.NEXT_PUBLIC_LILYPOND_SERVER_URL;
      const endpoint = lilypondServerUrl 
        ? `${lilypondServerUrl}/convert`
        : '/api/lilypond-to-svg';
      const isExternalServer = !!lilypondServerUrl;

      addLog(`Using endpoint: ${endpoint} (external: ${isExternalServer})`);
      const response = await fetch(endpoint, {
        method: 'POST',
        ...(isExternalServer 
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: lilypondContent }) }
          : { body: (() => { const fd = new FormData(); fd.append('content', lilypondContent); return fd; })() }
        ),
      });

      addLog(`Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const responseText = await response.text();
        addLog(`Error response: ${responseText.substring(0, 200)}`);
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          setError(`Server error (${response.status}): ${responseText.substring(0, 200)}`);
          return;
        }
        setError(`API Error: ${errorData.error} - ${errorData.details || ''}`);
      } else {
        const data = await response.json();
        addLog(`Success! ${data.pageCount} pages generated`);
        setResult(data);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Exception: ${errMsg}`);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const testWithViewer = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLogs([]);
    
    try {
      const lyVersion = await findLilypondVersion();
      if (!lyVersion) throw new Error('No .ly file found in database. Import a song with a .ly version first.');
      
      addLog(`Using ${lyVersion.songTitle}/${lyVersion.label} (${lyVersion.content.length} bytes)`);
      addLog('Setting content for LilypondViewer...');
      setLyContent(lyVersion.content);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Exception: ${errMsg}`);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const testVersion = async (version: LyVersion) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLyContent(null);
    setLogs([]);

    try {
      let content = version.content;
      if (!content && version.blobUrl) {
        addLog(`Fetching content from blobUrl: ${version.blobUrl}`);
        const blobResponse = await fetch(version.blobUrl);
        if (!blobResponse.ok) throw new Error('Failed to fetch blob content');
        content = await blobResponse.text();
      }
      if (!content) throw new Error('No content available for this version');

      addLog(`Testing ${version.songTitle}/${version.label} (${content.length} bytes)`);
      setLyContent(content);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Exception: ${errMsg}`);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-4">LilyPond to SVG Test</h1>
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left column - list */}
        <div className="w-[400px] flex-shrink-0 overflow-y-auto">
          <div className="mb-4">
            <button onClick={testSimple} disabled={loading} className="bg-blue-500 text-white px-3 py-1 text-sm disabled:bg-gray-400 mr-2">
              Test Simple
            </button>
          </div>
          <h2 className="text-sm font-semibold mb-2">.ly Versions ({lyVersions.length})</h2>
          {loadingVersions ? (
            <div className="text-gray-400 text-sm">Loading...</div>
          ) : lyVersions.length === 0 ? (
            <div className="text-gray-400 text-sm">No .ly versions found</div>
          ) : (
            <table className="text-xs w-full">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="pr-2">Song</th>
                  <th className="pr-2">Label</th>
                  <th className="pr-1">C</th>
                  <th className="pr-1">B</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lyVersions.map((v) => (
                  <tr key={v.versionId} className="border-t border-gray-700">
                    <td className="pr-2 py-1 max-w-[120px] truncate" title={v.songTitle}>{v.songTitle}</td>
                    <td className="pr-2 py-1 max-w-[100px] truncate" title={v.label}>{v.label}</td>
                    <td className="pr-1 py-1">{v.hasContent ? '✓' : '✗'}</td>
                    <td className="pr-1 py-1">{v.hasBlobUrl ? '✓' : '✗'}</td>
                    <td className="py-1">
                      <button
                        onClick={() => testVersion(v)}
                        disabled={loading || (!v.hasContent && !v.hasBlobUrl)}
                        className="text-blue-400 hover:underline disabled:text-gray-500 disabled:no-underline"
                      >
                        Test
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column - results */}
        <div className="flex-1 overflow-y-auto">
          {logs.length > 0 && (
            <div className="bg-gray-700 p-2 mb-4 text-xs">
              {logs.map((log, i) => (
                <div key={i} className="font-mono">{log}</div>
              ))}
            </div>
          )}

          {loading && <div className="text-gray-500">Converting...</div>}
          
          {error && (
            <div className="bg-red-100 text-red-700 px-3 py-2 text-sm mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {result && (
            <div className="space-y-4">
              <div className="bg-green-100 text-green-700 px-3 py-2 text-sm">
                <strong>Success!</strong> Generated {result.pageCount} page(s)
              </div>
              {result.svgs && result.svgs.map((svg: string, index: number) => (
                <div key={index} className="border p-4">
                  <h3 className="font-bold mb-2 text-sm">Page {index + 1} ({svg.length} bytes)</h3>
                  <div className="overflow-auto" dangerouslySetInnerHTML={{ __html: svg }} />
                </div>
              ))}
            </div>
          )}

          {lyContent && (
            <div>
              <p className="text-xs text-gray-400 mb-2">LilypondViewer Component</p>
              <div className="bg-black p-4">
                <LilypondViewer lilypondContent={lyContent} />
              </div>
            </div>
          )}

          {!loading && !error && !result && !lyContent && (
            <div className="text-gray-500 text-sm">Click "Test" on a version to see the result here</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestLilypondPage;
