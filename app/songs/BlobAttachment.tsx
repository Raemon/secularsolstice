'use client';

import { useState, useEffect } from 'react';
import ChevronArrow from '@/app/components/ChevronArrow';
import PDFViewer from './PDFViewer';
import SheetMusicViewer from './SheetMusicViewer';
import { SUPPORTED_EXTENSIONS } from './types';
import type { SongVersion } from './types';

const getFileType = (pathname: string): 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'musicxml' | 'musescore' | null => {
  const ext = pathname.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  if (SUPPORTED_EXTENSIONS.image.includes(ext)) return 'image';
  if (SUPPORTED_EXTENSIONS.video.includes(ext)) return 'video';
  if (SUPPORTED_EXTENSIONS.audio.includes(ext)) return 'audio';
  if (SUPPORTED_EXTENSIONS.pdf.includes(ext)) return 'pdf';
  if (SUPPORTED_EXTENSIONS.musicxml.includes(ext)) return 'musicxml';
  if (SUPPORTED_EXTENSIONS.musescore.includes(ext)) return 'musescore';
  if (SUPPORTED_EXTENSIONS.text.includes(ext)) return 'text';
  return null;
};

const TextPreview = ({ url }: { url: string }) => {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch(url)
      .then(res => res.text())
      .then(setContent)
      .catch(() => setError(true));
  }, [url]);
  if (error) return <div className="text-red-400 text-sm py-2">Failed to load text</div>;
  if (content === null) return <div className="text-gray-400 text-sm py-2">Loading...</div>;
  return <pre className="bg-gray-900 p-2 text-xs overflow-auto max-h-64 my-2 whitespace-pre-wrap">{content.slice(0, 5000)}</pre>;
};

const MusicXmlPreview = ({ url, version }: { url: string; version?: SongVersion | null }) => {
  return <SheetMusicViewer url={url} version={version} />;
};

const MuseScorePreview = ({ url, filename, version }: { url: string; filename: string; version?: SongVersion | null }) => {
  const lowerFilename = filename.toLowerCase();
  const isDirectXml = lowerFilename.endsWith('.mscx') || lowerFilename.endsWith('.mxml') || lowerFilename.endsWith('.mxl');
  const [musicXml, setMusicXml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    // .mscx, .mxml, and .mxl files can be passed directly to SheetMusicViewer without conversion
    if (isDirectXml) return;
    const convert = async () => {
      setIsConverting(true);
      setError(null);
      try {
        // Get the lilypond server URL from config (same server handles mscz conversion)
        let serverUrl = process.env.NEXT_PUBLIC_LILYPOND_SERVER_URL;
        if (!serverUrl) {
          try {
            const configRes = await fetch('/api/config');
            if (configRes.ok) {
              const config = await configRes.json();
              serverUrl = config.lilypondServerUrl;
            }
          } catch (e) {
            console.warn('Failed to fetch config:', e);
          }
        }
        // Fetch the .mscz file
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: 'application/x-musescore' });
        const formData = new FormData();
        formData.append('file', file);
        // Use remote server if available, otherwise fall back to local API
        const endpoint = serverUrl ? `${serverUrl}/convert-mscz` : '/api/convert';
        const convertResponse = await fetch(endpoint, { method: 'POST', body: formData });
        if (!convertResponse.ok) {
          const errText = await convertResponse.text();
          let errData;
          try { errData = JSON.parse(errText); } catch { errData = { error: errText }; }
          throw new Error(errData.error || errData.details || `Conversion failed: ${convertResponse.status}`);
        }
        const xmlContent = await convertResponse.text();
        setMusicXml(xmlContent);
      } catch (err) {
        console.error('MuseScore conversion error:', err);
        setError(err instanceof Error ? err.message : 'Conversion failed');
      } finally {
        setIsConverting(false);
      }
    };
    convert();
  }, [url, filename, isDirectXml]);

  if (isDirectXml) return <SheetMusicViewer url={url} version={version} />;
  if (isConverting) return <div className="text-gray-400 text-sm py-2">Converting MuseScore file...</div>;
  if (error) return <div className="text-red-400 text-sm py-2">Conversion error: {error}</div>;
  if (!musicXml) return null;
  return <SheetMusicViewer musicXml={musicXml} version={version} />;
};

const FilePreview = ({ url, pathname, version }: { url: string; pathname: string; version?: SongVersion | null }) => {
  const fileType = getFileType(pathname);
  if (!fileType) return <div className="text-gray-500 text-sm py-2">Cannot preview this file type</div>;
  switch (fileType) {
    case 'image':
      return <img src={url} alt={pathname} className="max-w-full max-h-96 object-contain my-2" />;
    case 'video':
      return <video src={url} controls className="max-w-full max-h-96 my-2" />;
    case 'audio':
      return <audio src={url} controls className="my-2" />;
    case 'pdf':
      return <PDFViewer fileUrl={url} />;
    case 'musicxml':
      return <MusicXmlPreview url={url} version={version} />;
    case 'musescore':
      return <MuseScorePreview url={url} filename={pathname} version={version} />;
    case 'text':
      return <TextPreview url={url} />;
    default:
      return null;
  }
};

const BlobAttachment = ({ blobUrl, defaultExpanded = false, version }: { blobUrl: string; defaultExpanded?: boolean; version?: SongVersion | null }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [downloading, setDownloading] = useState(false);
  const filename = (() => {
    try {
      const pathname = new URL(blobUrl).pathname;
      return pathname.split('/').pop() || 'Attached file';
    } catch {
      return blobUrl.split('/').pop() || 'Attached file';
    }
  })();
  const fileType = getFileType(filename);
  const canPreview = fileType !== null;

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1">
        {canPreview ? (
          <ChevronArrow isExpanded={expanded} className="cursor-pointer text-xs opacity-50 hover:opacity-100" onClick={() => setExpanded(!expanded)} />
        ) : (
          <span className="w-3" />
        )}
        <a href={blobUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline text-xs">
          📎 {filename}
        </a>
        <button onClick={handleDownload} disabled={downloading} className="text-gray-400 hover:text-gray-200 text-xs ml-1 disabled:opacity-50">{downloading ? '...' : '⬇'}</button>
      </div>
      {expanded && canPreview && (
        <div className="ml-4 mt-4">
          <FilePreview url={blobUrl} pathname={filename} version={version} />
        </div>
      )}
    </div>
  );
};

export default BlobAttachment;
