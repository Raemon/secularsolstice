const SearchInput = ({searchTerm, onSearchChange}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}) => {
  return (
    <input
      type="text"
      placeholder="Search songs or versions..."
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
      className="mb-3 px-2 py-1 w-full max-w-md"
    />
  );
};

export default SearchInput;

