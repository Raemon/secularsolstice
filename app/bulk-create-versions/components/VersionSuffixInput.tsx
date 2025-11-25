type Props = {
  value: string;
  onChange: (value: string) => void;
};

const VersionSuffixInput = ({ value, onChange }: Props) => (
  <div>
    <label className="text-xs text-gray-600">Version Suffix</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1 text-xs border border-gray-300"
      placeholder="e.g., '2024', 'draft', etc."
    />
  </div>
);

export default VersionSuffixInput;

