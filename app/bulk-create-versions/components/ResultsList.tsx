import type { ProcessResult } from '../types';

type Props = {
  results: ProcessResult[];
};

const ResultsList = ({ results }: Props) => {
  if (results.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold">Results:</div>
      {results.map((result, idx) => (
        <div key={idx} className="text-xs border border-gray-200 p-2">
          <div className={result.matched ? 'text-green-600' : 'text-red-600'}>
            {result.title}: {result.matched ? '✓ Matched' : '✗ No match found'}
          </div>
          {result.error && (
            <div className="text-red-600 mt-1">Error: {result.error}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ResultsList;








