import { forwardRef } from 'react';

const SearchInput = forwardRef<HTMLInputElement, {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}>(({searchTerm, onSearchChange}, ref) => {
  return (
    <input
      ref={ref}
      type="text"
      placeholder="Search songs or versions..."
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
      className="px-2 py-1 w-full max-w-md bg-transparent border-0 border-b border-gray-500 outline-none text-sm max-w-[200px] mr-auto"
    />
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;

