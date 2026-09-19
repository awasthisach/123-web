import React from 'react';
import { DriveFileTypeFilter } from '../lib/googleDriveService';

const OPTIONS: { id: DriveFileTypeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'documents', label: 'Docs' },
  { id: 'pdfs', label: 'PDF' },
  { id: 'images', label: 'Photos' },
  { id: 'videos', label: 'Videos' },
  { id: 'spreadsheets', label: 'Sheets' },
];

interface FileTypeSelectorProps {
  value: DriveFileTypeFilter;
  onChange: (value: DriveFileTypeFilter) => void;
  disabled?: boolean;
}

export const FileTypeSelector: React.FC<FileTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {OPTIONS.map(opt => (
        <button
          key={opt.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.id)}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition min-h-[32px] cursor-pointer disabled:opacity-50 ${
            value === opt.id
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-blue-400'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default FileTypeSelector;
