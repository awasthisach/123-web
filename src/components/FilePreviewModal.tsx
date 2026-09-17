import React from 'react';
import {
  X,
  Download,
  HardDrive,
  FileText,
  Lock,
  Tag,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { DriveFile } from '../types';
import { formatBytes } from '../lib/driveApi';

interface FilePreviewModalProps {
  file: DriveFile | null;
  onClose: () => void;
  onToggleOffline: (id: string) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onToggleOffline,
}) => {
  if (!file) return null;

  return (
    <div
      id="file-preview-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="file-preview-modal-card"
        className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {file.name}
            </h3>
          </div>
          <button
            id="close-file-preview-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Dynamic Scaling Image Preview */}
          {file.thumbnailUrl ? (
            <div className="rounded-xl overflow-hidden bg-zinc-950/5 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center p-2">
              <img
                src={file.thumbnailUrl}
                alt={file.name}
                className="max-h-72 w-auto max-w-full rounded-lg object-contain shadow-xs"
              />
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-200 dark:border-zinc-700 text-center">
              <FileText className="w-12 h-12 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">Document / Data Payload Preview</p>
              <p className="text-[11px] font-mono text-zinc-400 mt-1">{file.mimeType}</p>
            </div>
          )}

          {/* AI Semantic Summary */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Semantic AI Analysis</span>
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {file.semanticSummary}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-400 block text-[11px]">Size</span>
              <span className="font-semibold font-mono text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                {formatBytes(file.size)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-400 block text-[11px]">Modified</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                {new Date(file.modifiedTime).toLocaleDateString()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 col-span-2">
              <span className="text-zinc-400 block text-[11px]">SHA-256 Checksum Hash</span>
              <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 break-all select-all mt-0.5 block">
                {file.contentHash}
              </span>
            </div>
          </div>

          {/* Tags */}
          <div>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {file.tags.map(t => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-md text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 bg-zinc-50 dark:bg-zinc-800/30">
          <button
            type="button"
            onClick={() => onToggleOffline(file.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition min-h-[44px] ${
              file.isOffline
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            {file.isOffline ? 'Cached Locally (Pinned)' : 'Pin for Offline Access'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold transition min-h-[44px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
