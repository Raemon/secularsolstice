import ChordmarkEditor from '../chordmark-converter/ChordmarkEditor';
import { detectFileType } from '../../lib/lyricsExtractor';
import SlidesMovieUpload from './SlidesMovieUpload';
import BlobUpload from './BlobUpload';

export type CreateVersionFormProps = {
  form: { label: string; content: string; audioUrl: string; slidesMovieUrl: string; slideMovieStart: number; bpm: number; transpose: number; previousVersionId: string; nextVersionId: string; slideCredits: string; programCredits: string; blobUrl: string };
  onFormChange: (updates: Partial<{ label: string; content: string; audioUrl: string; slidesMovieUrl: string; slideMovieStart: number; bpm: number; transpose: number; previousVersionId: string; nextVersionId: string; slideCredits: string; programCredits: string; blobUrl: string }>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
  autosaveKey?: string;
  versionCreatedAt?: string;
  songId?: string;
};

const CreateVersionForm = ({form, onFormChange, onSubmit, onCancel, isSubmitting, error, autosaveKey, versionCreatedAt, songId}: CreateVersionFormProps) => {
  const fileType = detectFileType(form.label, form.content);
  const isChordmarkFile = fileType === 'chordmark';
  const isLilypondFile = fileType === 'lilypond';
  const isUltimateGuitarFile = fileType === 'ultimateguitar';
  const isMusicFile = isChordmarkFile || isLilypondFile || isUltimateGuitarFile

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-gray-300">Label</label>
        <input
          type="text"
          value={form.label}
          onChange={(e) => onFormChange({ label: e.target.value })}
          className="w-full px-2 py-1 text-sm border border-gray-300 bg-black"
          placeholder="Version label"
        />
      </div>
      {isMusicFile && (
        <div>
        <label className="text-xs text-gray-400">BPM (optional)</label>
        <input
          type="number"
          value={form.bpm}
          onChange={(e) => onFormChange({ bpm: parseInt(e.target.value) || 100 })}
          className="w-full px-2 py-1 text-xs border border-gray-300 bg-black"
          placeholder="BPM"
        />
      </div>)}
      {!isChordmarkFile && isMusicFile && (
        <div>
          <label className="text-xs text-gray-400">Transpose (optional)</label>
          <input
            type="number"
            value={form.transpose}
            onChange={(e) => onFormChange({ transpose: parseInt(e.target.value) || 0 })}
            className="w-full px-2 py-1 text-xs border border-gray-300 bg-black"
            placeholder="0"
          />
        </div>
      )}
      <div>
        <label className="text-xs text-gray-400">Content</label>
        {isChordmarkFile ? (
          <ChordmarkEditor
            value={form.content}
            onChange={(content) => onFormChange({ content })}
            showSyntaxHelp={true}
            bpm={form.bpm || 90}
            autosaveKey={autosaveKey}
            versionCreatedAt={versionCreatedAt}
            initialTranspose={form.transpose}
            onTransposeChange={(transpose: number) => onFormChange({ transpose })}
          />
        ) : (
          <textarea
            value={form.content}
            onChange={(e) => onFormChange({ content: e.target.value })}
            className="w-full h-64 p-2 text-xs font-mono border border-gray-300 bg-black/80"
            placeholder="Version content"
          />
        )}
      </div>
      <div>
        <label className="text-xs text-gray-400">Audio URL (optional)</label>
        <input
          type="text"
          value={form.audioUrl}
          onChange={(e) => onFormChange({ audioUrl: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 bg-black"
          placeholder="Audio URL"
        />
      </div>
      <div>
        <SlidesMovieUpload slidesMovieUrl={form.slidesMovieUrl} onFormChange={onFormChange} songId={songId} />
      </div>
      <div>
        <label className="text-xs text-gray-400">Slide Movie Start (optional)</label>
        <input
          type="number"
          value={form.slideMovieStart}
          onChange={(e) => onFormChange({ slideMovieStart: parseInt(e.target.value) || 0 })}
          className="w-full px-2 py-1 text-xs border border-gray-300 bg-black"
          placeholder="Slide number to start movie"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400">Previous Version ID (optional)</label>
        <input
          type="text"
          value={form.previousVersionId}
          onChange={(e) => onFormChange({ previousVersionId: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 bg-black"
          placeholder="Previous Version ID"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400">Next Version ID (optional)</label>
        <input
          type="text"
          value={form.nextVersionId}
          onChange={(e) => onFormChange({ nextVersionId: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 bg-black"
          placeholder="Next Version ID"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400">Slide Credits (optional)</label>
        <input
          type="text"
          value={form.slideCredits}
          onChange={(e) => onFormChange({ slideCredits: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 bg-black"
          placeholder="Slide Credits"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400">Program Credits (optional)</label>
        <input
          type="text"
          value={form.programCredits}
          onChange={(e) => onFormChange({ programCredits: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 bg-black"
          placeholder="Program Credits"
        />
      </div>
      <div>
        <BlobUpload blobUrl={form.blobUrl} onFormChange={onFormChange} songId={songId} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="text-xs px-2 py-1 bg-blue-600 text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Version'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-xs px-2 py-1 border border-gray-300 text-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-red-600 text-xs">{error}</p>
      )}
    </div>
  );
};

export default CreateVersionForm;
