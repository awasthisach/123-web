import React, { useState } from 'react';
import {
  Copy,
  Trash2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  HardDrive,
  FileCheck,
  Calendar,
  Check,
  FileText,
} from 'lucide-react';
import { DriveFile, DuplicateGroup } from '../types';
import { findDuplicates } from '../lib/duplicateEngine';
import { formatBytes } from '../lib/driveApi';

interface DuplicateFinderProps {
  files: DriveFile[];
  onRemoveFiles: (ids: string[]) => void;
}

export const DuplicateFinder: React.FC<DuplicateFinderProps> = ({
  files,
  onRemoveFiles,
}) => {
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<string>>(() => {
    const dups = findDuplicates(files);
    const initial = new Set<string>();
    dups.forEach(group => {
      // Auto-select all except the first (oldest) file
      group.files.slice(1).forEach(f => initial.add(f.id));
    });
    return initial;
  });

  const duplicateGroups = findDuplicates(files);

  const totalReclaimable = duplicateGroups.reduce(
    (acc, group) => acc + group.reclaimableSize,
    0
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedDuplicates);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedDuplicates(next);
  };

  const handleSelectAllDuplicates = () => {
    const next = new Set<string>();
    duplicateGroups.forEach(group => {
      group.files.slice(1).forEach(f => next.add(f.id));
    });
    setSelectedDuplicates(next);
  };

  const handleDeselectAll = () => {
    setSelectedDuplicates(new Set());
  };

  const handleCleanSelected = () => {
    if (selectedDuplicates.size === 0) return;
    onRemoveFiles(Array.from(selectedDuplicates));
    setSelectedDuplicates(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Metric */}
      <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-indigo-950/80 via-zinc-900 to-zinc-950 text-white border border-indigo-900/30 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Copy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Smart Duplicate File Cleaner</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  SHA-256 Content Hash
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
                Identifies identical byte-for-byte file copies across Google Drive folders even if filenames or extensions differ.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="text-right">
              <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">Reclaimable</p>
              <p className="text-base sm:text-xl font-bold text-emerald-400 font-mono">
                {formatBytes(totalReclaimable)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {duplicateGroups.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">Zero Duplicates Detected</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            All files in your Google Drive and offline storage have unique content hashes. Your storage is completely optimized!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Action and Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {duplicateGroups.length} Duplicate Group{duplicateGroups.length > 1 ? 's' : ''} Found
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <button
                type="button"
                onClick={handleSelectAllDuplicates}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium min-h-[36px] flex items-center"
              >
                Select Redundant
              </button>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 min-h-[36px] flex items-center"
              >
                Deselect All
              </button>
            </div>

            <button
              id="clean-duplicates-btn"
              type="button"
              onClick={handleCleanSelected}
              disabled={selectedDuplicates.size === 0}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-40 min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              Remove {selectedDuplicates.size} Selected ({formatBytes(
                files.filter(f => selectedDuplicates.has(f.id)).reduce((a, b) => a + b.size, 0)
              )})
            </button>
          </div>

          {/* Duplicate Groups List */}
          <div className="space-y-4">
            {duplicateGroups.map((group, gIdx) => (
              <div
                key={group.hash}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs"
              >
                <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      Group #{gIdx + 1}
                    </span>
                    <span className="text-zinc-500 font-mono text-[11px] truncate max-w-[200px] sm:max-w-xs">
                      Hash: {group.hash.slice(0, 16)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-zinc-500">File size: {formatBytes(group.files[0].size)} each</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Save {formatBytes(group.reclaimableSize)}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {group.files.map((file, idx) => {
                    const isSelected = selectedDuplicates.has(file.id);
                    const isOriginal = idx === 0;

                    return (
                      <div
                        key={file.id}
                        className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                          isSelected
                            ? 'bg-rose-50/40 dark:bg-rose-950/20'
                            : isOriginal
                            ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleSelect(file.id)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition min-h-[44px] min-w-[44px] shrink-0 ${
                              isSelected
                                ? 'bg-rose-600 border-rose-600 text-white'
                                : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                            }`}
                            aria-label={`Select ${file.name} for cleanup`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </button>

                          {file.thumbnailUrl ? (
                            <img
                              src={file.thumbnailUrl}
                              alt={file.name}
                              className="w-10 h-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                {file.name}
                              </span>
                              {isOriginal ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                                  Keep (Primary)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                  Duplicate #{idx}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                              <span>Modified: {new Date(file.modifiedTime).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{formatBytes(file.size)}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {isSelected ? (
                            <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                              <Trash2 className="w-3.5 h-3.5" /> Marked to delete
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleSelect(file.id)}
                              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium px-2 py-1 rounded min-h-[36px] flex items-center"
                            >
                              Mark for removal
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
