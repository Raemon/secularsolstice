import type { KeyboardEvent } from 'react';

const CreateProgramModal = ({visible, newProgramTitle, onChangeTitle, onClose, onSubmit, onKeyDown}: {visible: boolean, newProgramTitle: string, onChangeTitle: (value: string) => void, onClose: () => void, onSubmit: () => void, onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void}) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="p-4 max-w-md w-full" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-3">Create New Program</h2>
        <input
          value={newProgramTitle}
          onChange={(event) => onChangeTitle(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Program title"
          className="text-sm px-2 py-1 w-full mb-3"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="text-sm px-3 py-1">
            Cancel
          </button>
          <button type="button" onClick={onSubmit} className="text-sm px-3 py-1">
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProgramModal;




