'use client';

import { useEffect, useState } from 'react';
import type { Program } from '../types';
import VideoFrameUploader from '../components/VideoFrameUploader';
import { useUser } from '../../contexts/UserContext';

type ProgramEditPanelProps = {
  programId: string;
  onClose: () => void;
  onProgramUpdated?: (program: Program) => void;
};

const ProgramEditPanel = ({ programId, onClose, onProgramUpdated }: ProgramEditPanelProps) => {
  const { isAdmin, userName, userId } = useUser();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [foreword, setForeword] = useState('');
  const [epitaph, setEpitaph] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isSubprogram, setIsSubprogram] = useState(false);
  const [locked, setLocked] = useState(false);
  const [createdBy, setCreatedBy] = useState('');
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
        setLocked(data.program.locked);
        setCreatedBy(data.program.createdBy || '');
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

  const canToggleLock = isAdmin || (userName && program?.createdBy === userName);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      let body: Record<string, unknown>;
      if (program?.locked && canToggleLock) {
        body = { locked, userId };
      } else {
        body = {
          title,
          printProgramForeword: foreword || null,
          printProgramEpitaph: epitaph || null,
          videoUrl: videoUrl || null,
          isSubprogram,
          userId,
        };
        if (canToggleLock) body.locked = locked;
        if (isAdmin) body.createdBy = createdBy || null;
      }
      const response = await fetch(`/api/programs/${programId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error('Failed to save program');
      }
      const data = await response.json();
      setProgram(data.program);
      setIsSubprogram(data.program.isSubprogram);
      setLocked(data.program.locked);
      setCreatedBy(data.program.createdBy || '');
      onProgramUpdated?.(data.program);
      onClose();
    } catch (err) {
      console.error('Failed to save program:', err);
      setError(err instanceof Error ? err.message : 'Failed to save program');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="md:pl-4 w-full lg:p-20 relative xl:max-w-4xl mx-auto">
        <div className="text-gray-400">Loading program...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="md:pl-4 w-full lg:p-20 relative xl:max-w-4xl mx-auto">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="md:pl-4 w-full lg:p-20 relative xl:max-w-4xl mx-auto">
        <div className="text-gray-400">Program not found</div>
      </div>
    );
  }

  const isLocked = program?.locked ?? false;
  const fieldsDisabled = isLocked;

  return (
    <div className="md:pl-4 w-full lg:p-20 relative xl:max-w-4xl mx-auto overflow-x-hidden">
      <h2 className="font-georgia sm:-ml-8 text-4xl my-8 sm:mt-0 flex items-center gap-3 text-balance">
        <button onClick={onClose} className="hidden sm:block text-gray-400 hover:text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        Edit Program
      </h2>
      {isLocked && <div className="mb-4 text-yellow-500 text-sm">This program is locked. {canToggleLock ? 'Unlock it to edit other fields.' : 'Only the creator or an admin can unlock it.'}</div>}
      <div className="space-y-4">
        <div className={fieldsDisabled ? 'opacity-50' : ''}>
          <label className="block text-sm mb-1">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={fieldsDisabled} className="w-full px-2 py-1 border border-gray-300 bg-white text-black disabled:cursor-not-allowed"/>
        </div>
        <div className={fieldsDisabled ? 'opacity-50' : ''}>
          <label className="block text-sm mb-1">Video URL</label>
          <div className="flex items-center gap-2">
            <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} disabled={fieldsDisabled} className="w-full px-2 py-1 border border-gray-300 bg-white text-black disabled:cursor-not-allowed"/>
            {!fieldsDisabled && <VideoFrameUploader programId={programId} onUploadComplete={(uploadedUrl) => {
              if (uploadedUrl) {
                setVideoUrl(uploadedUrl);
                setProgram((prev) => prev ? {...prev, videoUrl: uploadedUrl} : prev);
              }
            }}/>}
          </div>
        </div>
        <div className={fieldsDisabled ? 'opacity-50' : ''}>
          <label className="block text-sm mb-1">Print Program Foreword (appears at the start of page 2)</label>
          <textarea value={foreword} onChange={(e) => setForeword(e.target.value)} rows={6} disabled={fieldsDisabled} className="w-full px-2 py-1 border border-gray-300 bg-white text-black font-mono text-sm disabled:cursor-not-allowed"/>
        </div>
        <div className={fieldsDisabled ? 'opacity-50' : ''}>
          <label className="block text-sm mb-1">Print Program Epitaph (appears centered on page 4)</label>
          <textarea value={epitaph} onChange={(e) => setEpitaph(e.target.value)} rows={6} disabled={fieldsDisabled} className="w-full px-2 py-1 border border-gray-300 bg-white text-black font-mono text-sm disabled:cursor-not-allowed"/>
        </div>
        <div className={`flex items-center gap-2 text-sm text-gray-200 ${fieldsDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => !fieldsDisabled && setIsSubprogram(!isSubprogram)}>
          <input type="checkbox" checked={isSubprogram} disabled={fieldsDisabled} />
          <span>Mark as subprogram (hidden from main dropdown)</span>
        </div>
        {canToggleLock ? (
          <div className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer" onClick={() => setLocked(!locked)}>
            <input type="checkbox" checked={locked} readOnly />
            <span>Lock program (prevent others from editing)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-200 opacity-50 cursor-not-allowed">
            <input type="checkbox" checked={locked} disabled />
            <span>Lock program (prevent others from editing)</span>
          </div>
        )}
        {isAdmin && (
          <div className={fieldsDisabled ? 'opacity-50' : ''}>
            <label className="block text-sm mb-1">Created By (admin only)</label>
            <input type="text" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} disabled={fieldsDisabled} className="w-full px-2 py-1 border border-gray-300 bg-white text-black disabled:cursor-not-allowed"/>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving || (isLocked && !canToggleLock)} className="px-4 py-2 bg-black text-white hover:bg-gray-800 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          {saveSuccess && <span className="text-green-600">Saved!</span>}
        </div>
      </div>
    </div>
  );
};

export default ProgramEditPanel;
