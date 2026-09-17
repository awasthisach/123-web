import React from 'react';
import {
  DownloadCloud,
  CheckCircle2,
  HardDrive,
  Trash2,
  ExternalLink,
  FileText,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { DriveFile } from '../types';
import { formatBytes } from '../lib/driveApi';

interface OfflineFilesListProps {
  files: DriveFile[];
  onToggleOffline: (fileId: string) => void;
  onSelectFile: (file: DriveFile) => void;
}

export const OfflineFilesList: React.FC<OfflineFilesListProps> = ({
  files,
  onToggleOffline,
  onSelectFile,
}) => {
  const offlineFiles = files.filter(f => f.isOffline);
  const totalCachedBytes = offlineFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-emerald-950/80 via-zinc-900 to-zinc-950 text-white border border-emerald-900/30 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Offline Pinned Storage</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  IndexedDB Local Cache
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
                Files cached securely on device memory for instant editing and viewing without network connectivity.
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right self-start sm:self-center">
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">Local Storage Used</p>
            <p className="text-base sm:text-xl font-bold text-emerald-400 font-mono">
              {formatBytes(totalCachedBytes)}
            </p>
          </div>
        </div>
      </div>

      {offlineFiles.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <DownloadCloud className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">No Offline Files Pinned</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            You can pin any file from the main file explorer to keep an encrypted local copy available when offline.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {offlineFiles.map(file => (
            <div
              key={file.id}
              className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/40 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {file.thumbnailUrl ? (
                      <img
                        src={file.thumbnailUrl}
                        alt={file.name}
                        className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {file.name}
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {formatBytes(file.size)} • Cache verified
                      </p>
                    </div>
                  </div>

                  <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2.5 line-clamp-2">
                  {file.semanticSummary}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectFile(file)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 min-h-[44px]"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Local Cache
                </button>

                <button
                  type="button"
                  onClick={() => onToggleOffline(file.id)}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-zinc-600 dark:text-zinc-400 text-xs transition min-h-[44px] flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Unpin
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
