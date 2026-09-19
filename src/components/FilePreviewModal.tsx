import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  HardDrive,
  FileText,
  Tag,
  Calendar,
  ExternalLink,
  Check,
} from 'lucide-react';
import { DriveFile } from '../types';
import { formatBytes } from '../lib/driveApi';
import { getOfflineBlob } from '../lib/offlineCache';

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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobMime, setBlobMime] = useState<string>('');
  const [blobLoading, setBlobLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;

    (async () => {
      if (!file?.isOffline) {
        setBlobUrl(null);
        return;
      }
      setBlobLoading(true);
      try {
        const blob = await getOfflineBlob(file.id);
        if (cancelled || !blob) {
          setBlobUrl(null);
          return;
        }
        url = URL.createObjectURL(blob);
        if (!cancelled) {
          setBlobUrl(url);
          setBlobMime(blob.type || file.mimeType || '');
        }
      } catch {
        if (!cancelled) setBlobUrl(null);
      } finally {
        if (!cancelled) setBlobLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file?.id, file?.isOffline, file?.mimeType]);

  if (!file) return null;

  const isImage =
    blobMime.startsWith('image/') ||
    file.mimeType.startsWith('image/') ||
    Boolean(file.thumbnailUrl);
  const isPdf =
    blobMime === 'application/pdf' ||
    file.mimeType === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');

  const handleDownloadCached = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = file.name;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
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
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {blobLoading && (
            <p className="text-xs text-zinc-500 text-center py-6">Loading offline cache…</p>
          )}

          {!blobLoading && blobUrl && isPdf && (
            <iframe
              title={file.name}
              src={blobUrl}
              className="w-full h-72 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white"
            />
          )}

          {!blobLoading && blobUrl && isImage && !isPdf && (
            <div className="rounded-xl overflow-hidden bg-zinc-950/5 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center p-2">
              <img src={blobUrl} alt={file.name} className="max-h-72 w-auto max-w-full rounded-lg object-contain" />
            </div>
          )}

          {!blobLoading && !blobUrl && file.thumbnailUrl && (
            <div className="rounded-xl overflow-hidden bg-zinc-950/5 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center p-2">
              <img
                src={file.thumbnailUrl}
                alt={file.name}
                className="max-h-72 w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          )}

          {!blobLoading && !blobUrl && !file.thumbnailUrl && (
            <div className="p-8 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-200 dark:border-zinc-700 text-center">
              <FileText className="w-12 h-12 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No local preview</p>
              <p className="text-[11px] font-mono text-zinc-400 mt-1">{file.mimeType}</p>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
            <p className="text-[11px] font-semibold text-zinc-500 mb-1">Metadata summary</p>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {file.semanticSummary || file.name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-400 block text-[11px]">Size</span>
              <span className="font-semibold font-mono text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                {formatBytes(file.size)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-400 block text-[11px] flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Modified
              </span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                {new Date(file.modifiedTime).toLocaleDateString()}
              </span>
            </div>
          </div>

          {(file.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(file.tags || []).map(t => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-300"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onToggleOffline(file.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold min-h-[40px] border ${
              file.isOffline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900'
                : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
            }`}
          >
            {file.isOffline ? <Check className="w-3.5 h-3.5" /> : <HardDrive className="w-3.5 h-3.5" />}
            {file.isOffline ? 'Cached (Unpin)' : 'Pin offline'}
          </button>

          {blobUrl && (
            <button
              type="button"
              onClick={handleDownloadCached}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold min-h-[40px] border border-zinc-200 dark:border-zinc-700"
            >
              <Download className="w-3.5 h-3.5" />
              Download cache
            </button>
          )}

          {file.webViewLink && (
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold min-h-[40px] bg-blue-600 text-white"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Drive
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
