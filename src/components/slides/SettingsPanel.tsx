const SettingsPanel = ({linesPerSlide, setLinesPerSlide}:{linesPerSlide: number, setLinesPerSlide: (value: number) => void}) => {
  return (
    <div className="mb-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
      <div className="flex items-center mb-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm mr-4 flex-shrink-0">3</div>
        <h2 className="text-gray-900 font-semibold text-lg m-0">Configure Settings</h2>
      </div>
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-gray-900 font-medium mb-2 text-sm">Lines per slide</label>
          <input type="number" value={linesPerSlide} onChange={(e) => setLinesPerSlide(parseInt(e.target.value))} min="1" max="20" className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 bg-white" />
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;

