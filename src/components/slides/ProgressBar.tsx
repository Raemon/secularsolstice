const ProgressBar = ({percent, text, show}:{percent: number, text: string, show: boolean}) => {
  if (!show) return null;
  
  return (
    <div className="mt-6 bg-white p-6 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-gray-900 text-sm">Generating Presentation</div>
        <div className="font-semibold text-indigo-600 text-sm">{Math.round(percent)}%</div>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded overflow-hidden relative">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300 relative" style={{width: `${percent}%`}}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>
      <div className="mt-2 text-gray-500 text-xs text-center">{text}</div>
    </div>
  );
};

export default ProgressBar;

