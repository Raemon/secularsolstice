'use client';

import { useEffect, useState } from 'react';
import type { Program } from '../../types';
import VideoFrameUploader from '../../components/VideoFrameUploader';

type EditProgramContentProps = {
  programId: string;
};

const EditProgramContent = ({ programId }: EditProgramContentProps) => {
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [foreword, setForeword] = useState('');
  const [epitaph, setEpitaph] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isSubprogram, setIsSubprogram] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const loadProgram = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/programs/${programId}`);
        if (!response.ok) {
          throw new Error('Failed to load program');
        }
        const data = await response.json();
        setProgram(data.program);
        setTitle(data.program.title);
        setForeword(data.program.printProgramForeword || '');
        setEpitaph(data.program.printProgramEpitaph || '');
        setVideoUrl(data.program.videoUrl || '');
        setIsSubprogram(data.program.isSubprogram);
        setError(null);
      } catch (err) {
        console.error('Failed to load program:', err);
        setError(err instanceof Error ? err.message : 'Failed to load program');
      } finally {
        setLoading(false);
      }
    };

    loadProgram();
  }, [programId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          printProgramForeword: foreword || null,
          printProgramEpitaph: epitaph || null,
          videoUrl: videoUrl || null,
          isSubprogram,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save program');
      }
      const data = await response.json();
      setProgram(data.program);
      setIsSubprogram(data.program.isSubprogram);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save program:', err);
      setError(err instanceof Error ? err.message : 'Failed to save program');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading program...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Program not found</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <a href={`/programs/${programId}`} className="text-sm hover:opacity-50">← Back to Program</a>
      </div>
      <h1 className="text-2xl font-bold mb-4">Edit Program</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-2 py-1 border border-gray-300 bg-white text-black"/>
        </div>
        <div>
          <label className="block text-sm mb-1">Video URL</label>
          <div className="flex items-center gap-2">
            <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="w-full px-2 py-1 border border-gray-300 bg-white text-black"/>
            <VideoFrameUploader programId={programId} onUploadComplete={(uploadedUrl) => {
              if (uploadedUrl) {
                setVideoUrl(uploadedUrl);
                setProgram((prev) => prev ? {...prev, videoUrl: uploadedUrl} : prev);
              }
            }}/>
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Print Program Foreword (appears at the start of page 2)</label>
          <textarea value={foreword} onChange={(e) => setForeword(e.target.value)} rows={6} className="w-full px-2 py-1 border border-gray-300 bg-white text-black font-mono text-sm"/>
        </div>
        <div>
          <label className="block text-sm mb-1">Print Program Epitaph (appears centered on page 4)</label>
          <textarea value={epitaph} onChange={(e) => setEpitaph(e.target.value)} rows={6} className="w-full px-2 py-1 border border-gray-300 bg-white text-black font-mono text-sm"/>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer" onClick={() => setIsSubprogram(!isSubprogram)}>
          <input type="checkbox" checked={isSubprogram} />
          <span>Mark as subprogram (hidden from main dropdown)</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-black text-white hover:bg-gray-800 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          {saveSuccess && <span className="text-green-600">Saved!</span>}
        </div>
      </div>
    </div>
  );
};

export default EditProgramContent;

