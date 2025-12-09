'use client';

type PrivacyMode = 'private' | 'anonymous' | 'public';

const PrivacySettings = ({privacy, setPrivacy}: {privacy: PrivacyMode; setPrivacy: (mode: PrivacyMode) => void}) => {
  const options: {value: PrivacyMode; label: string; description: string}[] = [
    { value: 'private', label: 'Private', description: 'Only visible to you' },
    { value: 'anonymous', label: 'Anonymous', description: 'Visible to all, name hidden' },
    { value: 'public', label: 'Public', description: 'Visible to all with your name' },
  ];

  return (
    <div className="flex items-center gap-4 mb-4 text-sm">
      <span className="text-gray-400">Privacy:</span>
      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setPrivacy(option.value)}
            className={`px-3 py-1 ${privacy === option.value ? 'bg-gray-700 text-white' : 'bg-transparent text-gray-400 hover:text-white'}`}
            title={option.description}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PrivacySettings;

