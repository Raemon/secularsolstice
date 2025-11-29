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
      className="px-2 py-1 w-full max-w-md dark:bg-gray-800"
    />
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;

