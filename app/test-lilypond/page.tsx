'use client';

import { useState } from 'react';
import LilypondViewer from '../songs/LilypondViewer';

const TestLilypondPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lyContent, setLyContent] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

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
      addLog('Creating FormData...');
      const formData = new FormData();
      formData.append('content', simpleLilypond);

      addLog('Sending request to /api/lilypond-to-svg...');
      const response = await fetch('/api/lilypond-to-svg', {
        method: 'POST',
        body: formData,
      });

      addLog(`Response: ${response.status} ${response.statusText}`);
      const data = await response.json();
      
      if (!response.ok) {
        addLog(`Error: ${data.error}`);
        setError(`API Error: ${data.error} - ${data.details || ''}`);
      } else {
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

  const testFromFile = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLyContent(null);
    setLogs([]);

    try {
      addLog('Fetching Walk_With_Me/sheet-music.ly...');
      const fileResponse = await fetch('/api/songs?song=Walk_With_Me&file=sheet-music.ly');
      if (!fileResponse.ok) throw new Error('Failed to fetch .ly file');
      
      const fileData = await fileResponse.json();
      const lilypondContent = fileData.content;
      addLog(`Fetched ${lilypondContent.length} bytes`);

      addLog('Sending to /api/lilypond-to-svg...');
      const formData = new FormData();
      formData.append('content', lilypondContent);

      const response = await fetch('/api/lilypond-to-svg', {
        method: 'POST',
        body: formData,
      });

      addLog(`Response: ${response.status} ${response.statusText}`);
      const data = await response.json();
      
      if (!response.ok) {
        addLog(`Error: ${data.error}`);
        setError(`API Error: ${data.error} - ${data.details || ''}`);
      } else {
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
      addLog('Fetching Walk_With_Me/sheet-music.ly...');
      const fileResponse = await fetch('/api/songs?song=Walk_With_Me&file=sheet-music.ly');
      if (!fileResponse.ok) throw new Error('Failed to fetch .ly file');
      
      const fileData = await fileResponse.json();
      addLog(`Fetched ${fileData.content.length} bytes`);
      addLog('Setting content for LilypondViewer...');
      setLyContent(fileData.content);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Exception: ${errMsg}`);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">LilyPond to SVG Test</h1>
      
      <div className="space-x-4 mb-4">
        <button 
          onClick={testSimple}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 disabled:bg-gray-400"
        >
          Test Simple LilyPond
        </button>
        
        <button 
          onClick={testFromFile}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 disabled:bg-gray-400"
        >
          Test Walk With Me File
        </button>
        
        <button 
          onClick={testWithViewer}
          disabled={loading}
          className="bg-purple-500 text-white px-4 py-2 disabled:bg-gray-400"
        >
          Test with LilypondViewer Component
        </button>
      </div>

      {logs.length > 0 && (
        <div className="bg-gray-500 p-4 mb-4 rounded">
          <h3 className="font-bold mb-2">Logs:</h3>
          {logs.map((log, i) => (
            <div key={i} className="text-sm font-mono">{log}</div>
          ))}
        </div>
      )}

      {loading && <div className="text-gray-500">Converting...</div>}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {result && (
        <div className="space-y-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <strong>Success!</strong> Generated {result.pageCount} page(s)
          </div>
          
          {result.svgs && result.svgs.map((svg: string, index: number) => (
            <div key={index} className="border p-4">
              <h3 className="font-bold mb-2">Page {index + 1} (SVG length: {svg.length} bytes)</h3>
              <div 
                className="overflow-auto"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          ))}
        </div>
      )}

      {lyContent && (
        <div className="mt-8 border-t pt-4">
          <h2 className="text-xl font-bold mb-4">LilypondViewer Component Test</h2>
          <p className="text-sm text-gray-600 mb-2">This uses the same component as the songs page. Check browser console for [LilypondViewer] logs.</p>
          <div className="border p-4 bg-gray-50">
            <LilypondViewer lilypondContent={lyContent} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TestLilypondPage;


