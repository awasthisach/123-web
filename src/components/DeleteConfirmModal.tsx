import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { DriveFile } from '../types';
import { formatBytes } from '../lib/driveApi';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  filesToDelete: DriveFile[];
  onConfirmDelete: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  filesToDelete,
  onConfirmDelete,
}) => {
  if (!isOpen || filesToDelete.length === 0) return null;

  const totalBytes = filesToDelete.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="delete-confirm-modal"
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Delete {filesToDelete.length} {filesToDelete.length === 1 ? 'File' : 'Files'}?
              </h3>
              <p className="text-xs text-rose-500 font-medium">Reclaims {formatBytes(totalBytes)} of storage</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Are you sure you want to permanently delete these {filesToDelete.length} files from your Drive? This action cannot be undone.
          </p>

          <div className="max-h-40 overflow-y-auto p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-1.5 text-xs">
            {filesToDelete.map(f => (
              <div key={f.id} className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                <span className="truncate max-w-[240px]">{f.name}</span>
                <span className="text-[11px] font-mono text-zinc-400">{formatBytes(f.size)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs border border-amber-200 dark:border-amber-900/40">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Files will be removed from all active synced folders.</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition min-h-[40px]"
          >
            Cancel (रद्द करें)
          </button>
          <button
            type="button"
            onClick={onConfirmDelete}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-lg transition flex items-center gap-2 min-h-[40px]"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Selected (डिलीट करें)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
