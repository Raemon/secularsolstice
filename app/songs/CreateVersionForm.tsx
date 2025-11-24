const CreateVersionForm = ({form, onFormChange, onSubmit, onCancel, isSubmitting, error}: {
  form: { label: string; content: string; audioUrl: string };
  onFormChange: (updates: Partial<{ label: string; content: string; audioUrl: string }>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
}) => {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-gray-600">Label</label>
        <input
          type="text"
          value={form.label}
          onChange={(e) => onFormChange({ label: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300"
          placeholder="Version label"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600">Content</label>
        <textarea
          value={form.content}
          onChange={(e) => onFormChange({ content: e.target.value })}
          className="w-full h-64 p-2 text-xs font-mono border border-gray-300"
          placeholder="Version content"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600">Audio URL (optional)</label>
        <input
          type="text"
          value={form.audioUrl}
          onChange={(e) => onFormChange({ audioUrl: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300"
          placeholder="Audio URL"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="text-xs px-2 py-1 bg-blue-600 text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Version'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-xs px-2 py-1 border border-gray-300 text-gray-700 disabled:opacity-50"
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

