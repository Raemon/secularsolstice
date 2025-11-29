const SettingsPanel = ({linesPerSlide, setLinesPerSlide}:{linesPerSlide: number, setLinesPerSlide: (value: number) => void}) => {
  return (
    <div className="mb-4 flex items-center gap-2">
      <label className="text-sm">Lines per slide:</label>
      <input type="number" value={linesPerSlide} onChange={(e) => setLinesPerSlide(parseInt(e.target.value))} min="1" max="20" className="w-20 px-2 py-1 border text-sm focus:outline-none" />
    </div>
  );
};

export default SettingsPanel;

