import React, { useState } from 'react';
import { Copy, Trash2, CheckCircle, Check, FileText } from 'lucide-react';
import { DriveFile } from '../types';
import { findDuplicates } from '../lib/duplicateEngine';
import { formatBytes } from '../lib/driveApi';

interface DuplicateFinderProps {
  files: DriveFile[];
  onRemoveFiles: (ids: string[]) => void;
}

export const DuplicateFinder: React.FC<DuplicateFinderProps> = ({ files, onRemoveFiles }) => {
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<string>>(() => new Set());
  const duplicateGroups = findDuplicates(files);
  const totalReclaimable = duplicateGroups.reduce((acc, group) => acc + group.reclaimableSize, 0);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedDuplicates);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDuplicates(next);
  };

  const handleSelectAllDuplicates = () => {
    const next = new Set<string>();
    duplicateGroups.forEach(group => {
      group.files.slice(1).forEach(f => next.add(f.id));
    });
    setSelectedDuplicates(next);
  };

  const handleDeselectAll = () => setSelectedDuplicates(new Set());

  const handleCleanSelected = () => {
    if (selectedDuplicates.size === 0) return;
    onRemoveFiles(Array.from(selectedDuplicates));
    setSelectedDuplicates(new Set());
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-indigo-950/80 via-zinc-900 to-zinc-950 text-white border border-indigo-900/30 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Copy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Duplicate Candidate Cleaner</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Size/name · sha256 when offline-pinned
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
                Groups by SHA-256 when available, otherwise size + filename. Confirm before trash.
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">Possible reclaim</p>
            <p className="text-base sm:text-xl font-bold text-emerald-400 font-mono">{formatBytes(totalReclaimable)}</p>
          </div>
        </div>
      </div>

      {duplicateGroups.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold">No candidate groups</h3>
          <p className="text-xs text-zinc-500 mt-1">Pin files offline to enable SHA-256 confirmed groups.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-semibold">{duplicateGroups.length} group(s)</span>
              <button type="button" onClick={handleSelectAllDuplicates} className="text-indigo-600 hover:underline font-medium">
                Select non-primary
              </button>
              <button type="button" onClick={handleDeselectAll} className="text-zinc-500 hover:underline">
                Deselect all
              </button>
            </div>
            <button
              type="button"
              onClick={handleCleanSelected}
              disabled={selectedDuplicates.size === 0}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-40 min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              Trash {selectedDuplicates.size} selected
            </button>
          </div>

          {duplicateGroups.map((group, gIdx) => (
            <div key={group.hash} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-b text-xs flex flex-wrap gap-2 justify-between">
                <span className="font-bold">
                  Group #{gIdx + 1}{' '}
                  <span className="font-normal text-zinc-500">
                    {group.hash.startsWith('sha256:') ? 'confirmed SHA-256' : 'candidate'}
                  </span>
                </span>
                <span className="text-emerald-600 font-semibold">Save up to {formatBytes(group.reclaimableSize)}</span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {group.files.map((file, idx) => {
                  const isSelected = selectedDuplicates.has(file.id);
                  const isOriginal = idx === 0;
                  return (
                    <div
                      key={file.id}
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected ? 'bg-rose-50/40 dark:bg-rose-950/20' : isOriginal ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleSelect(file.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                            isSelected ? 'bg-rose-600 border-rose-600 text-white' : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold truncate">{file.name}</span>
                            {isOriginal ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Suggested keep</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-600">Candidate #{idx}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            {formatBytes(file.size)} • {new Date(file.modifiedTime).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
