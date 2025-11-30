'use client';

const TransposeControls = ({value, onChange, className}: {value: number; onChange: (value: number) => void; className?: string}) => {
  const displayValue = value > 0 ? `+${value}` : `${value}`;
  const handleChange = (delta: number) => {
    onChange(value + delta);
  };
  const containerClass = className || 'flex items-center gap-1 text-xs text-gray-400';

  return (
    <div className={containerClass}>
      <span>Transpose</span>
      <button
        onClick={() => handleChange(-1)}
        className="px-2 py-0.5 bg-gray-800 text-gray-200"
        title="Transpose down a half step"
      >
        -
      </button>
      <span className="w-8 text-center text-gray-200">{displayValue}</span>
      <button
        onClick={() => handleChange(1)}
        className="px-2 py-0.5 bg-gray-800 text-gray-200"
        title="Transpose up a half step"
      >
        +
      </button>
    </div>
  );
};

export default TransposeControls;

