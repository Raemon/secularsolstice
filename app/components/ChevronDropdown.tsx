'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type ChevronDropdownOption = {
  value: string;
  label: string;
};

const ChevronDropdown = ({value, options, onChange, placeholder, footer}: {value: string | null, options: ChevronDropdownOption[], onChange: (value: string | null) => void, placeholder?: string, footer?: ReactNode}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);


  return (
    <div className="relative flex items-center gap-1" ref={dropdownRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="text-gray-400 hover:text-gray-100 text-xs">
        ▼
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 border border-gray-300 shadow-lg min-w-[200px] top-full left-0">
          <div className="max-h-[300px] overflow-y-auto">
            {placeholder && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2 py-1 text-sm hover:bg-black/80 ${!value ? 'bg-black/80 font-semibold' : ''}`}
              >
                {placeholder}
              </button>
            )}
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2 py-1 text-sm hover:bg-black/80 ${option.value === value ? 'bg-black/80 font-semibold' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {footer && (
            <div className="border-t border-gray-300 w-full text-left px-2 py-1 text-sm text-blue-400 hover:bg-blue-50 cursor-pointer">
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChevronDropdown;

