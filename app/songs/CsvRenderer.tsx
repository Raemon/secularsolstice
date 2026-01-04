'use client';

const parseCsv = (content: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = i < content.length - 1 ? content[i + 1] : null;
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      // End of row
      currentRow.push(currentField);
      if (currentRow.length > 0 && currentRow.some(field => field.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else if (char === '\r' && !inQuotes) {
      // Handle \r\n or just \r
      if (nextChar === '\n') {
        // Skip both \r and \n
        currentRow.push(currentField);
        if (currentRow.length > 0 && currentRow.some(field => field.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++; // Skip \n
      } else {
        // Just \r
        currentRow.push(currentField);
        if (currentRow.length > 0 && currentRow.some(field => field.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      }
    } else {
      currentField += char;
    }
  }
  
  // Add final field and row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 0 && currentRow.some(field => field.trim().length > 0)) {
      rows.push(currentRow);
    }
  }
  
  return rows;
};

const CsvRenderer = ({ content }: { content: string }) => {
  const rows = parseCsv(content.trim());
  
  if (rows.length === 0) {
    return <div className="text-gray-500 text-xs">Empty CSV file.</div>;
  }
  
  return (
    <div className="overflow-x-auto max-w-full">
      <table className="text-xs border-collapse">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-2 py-1 ${rowIndex === 0 ? 'font-semibold border-b border-gray-600' : 'border-b border-gray-800'}`}
                >
                  {cell || '\u00A0'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CsvRenderer;
