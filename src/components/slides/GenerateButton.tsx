const GenerateButton = ({onClick, disabled, isGenerating}:{onClick: () => void, disabled: boolean, isGenerating: boolean}) => {
  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <button onClick={onClick} disabled={disabled} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none px-8 py-4 text-base font-semibold rounded-lg cursor-pointer transition-all w-full relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed hover:enabled:shadow-xl hover:enabled:-translate-y-0.5 active:enabled:translate-y-0 group">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
        <span>{isGenerating ? 'Generating...' : 'Generate Presentation'}</span>
      </button>
    </div>
  );
};

export default GenerateButton;

