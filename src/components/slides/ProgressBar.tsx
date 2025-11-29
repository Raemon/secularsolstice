const ProgressBar = ({percent, text, show}:{percent: number, text: string, show: boolean}) => {
  if (!show) return null;
  
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs">Generating Presentation</div>
        <div className="text-xs">{Math.round(percent)}%</div>
      </div>
      <div className="w-full h-1 bg-gray-800 overflow-hidden">
        <div className="h-full bg-black transition-all" style={{width: `${percent}%`}} />
      </div>
      <div className="mt-1 text-xs text-center">{text}</div>
    </div>
  );
};

export default ProgressBar;

