import React, { useState, useMemo } from 'react';
import {
  Folder,
  HardDrive,
  Shield,
  Copy,
  Sparkles,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Table,
  Archive,
  Lock,
  Star,
  Download,
  Trash2,
  MoreVertical,
  LayoutGrid,
  List,
  Eye,
  CheckCircle2,
  Cloud,
  X,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { DriveFile, FileCategory, VaultFile } from '../types';
import { formatBytes } from '../lib/driveApi';

interface DashboardProps {
  files: DriveFile[];
  vaultFiles: VaultFile[];
  onUploadFile: (newFile: DriveFile) => void;
  onDeleteFile: (id: string) => void;
  onToggleStar: (id: string) => void;
  onToggleOffline: (id: string) => void;
  onSelectTab: (tab: string) => void;
  onSelectPreviewFile: (file: DriveFile) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  files,
  vaultFiles,
  onUploadFile,
  onDeleteFile,
  onToggleStar,
  onToggleOffline,
  onSelectTab,
  onSelectPreviewFile,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Memoized storage metrics calculations
  const TOTAL_QUOTA = 15 * 1024 * 1024 * 1024; // 15 GB Google Drive Free Tier
  const { driveBytes, vaultBytes, totalUsedBytes, usedPercentage } = useMemo(() => {
    const dBytes = files.reduce((sum, f) => sum + f.size, 0);
    const vBytes = vaultFiles.reduce((sum, f) => sum + f.size, 0);
    const total = dBytes + vBytes;
    const pct = Math.min(100, Math.max(1, (total / TOTAL_QUOTA) * 100));
    return {
      driveBytes: dBytes,
      vaultBytes: vBytes,
      totalUsedBytes: total,
      usedPercentage: pct,
    };
  }, [files, vaultFiles]);

  // Duplicates calculation: O(N) Set lookup instead of O(N^2) findIndex
  const duplicateBytes = useMemo(() => {
    const seen = new Set<string>();
    let dupBytes = 0;
    for (const file of files) {
      if (seen.has(file.contentHash)) {
        dupBytes += file.size;
      } else {
        seen.add(file.contentHash);
      }
    }
    return dupBytes;
  }, [files]);

  // Memoized file filtering with cached lowercase query
  const filteredFiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return files.filter(file => {
      if (filterCategory === 'starred' && !file.starred) return false;
      if (filterCategory === 'vault' && !file.isEncrypted) return false;
      if (filterCategory !== 'all' && filterCategory !== 'starred' && filterCategory !== 'vault') {
        if (file.category !== filterCategory) return false;
      }
      if (q) {
        return (
          file.name.toLowerCase().includes(q) ||
          file.tags.some(t => t.toLowerCase().includes(q)) ||
          file.semanticSummary.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [files, filterCategory, searchTerm]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;

    let cat: FileCategory = 'document';
    if (uploaded.type.startsWith('image/')) cat = 'image';
    else if (uploaded.type.includes('sheet') || uploaded.name.endsWith('.xlsx')) cat = 'spreadsheet';
    else if (uploaded.type.includes('zip') || uploaded.type.includes('tar')) cat = 'archive';

    const newDriveItem: DriveFile = {
      id: `file-${Date.now()}`,
      name: uploaded.name,
      mimeType: uploaded.type || 'application/octet-stream',
      size: uploaded.size || 1024000,
      modifiedTime: new Date().toISOString(),
      createdTime: new Date().toISOString(),
      category: cat,
      thumbnailUrl: uploaded.type.startsWith('image/')
        ? URL.createObjectURL(uploaded)
        : undefined,
      isOffline: true,
      isEncrypted: false,
      contentHash: `user-${Date.now()}-${uploaded.size}`,
      tags: ['upload', 'local', cat],
      semanticSummary: `User-uploaded file: ${uploaded.name} added to responsive sync storage.`,
      starred: false,
    };

    onUploadFile(newDriveItem);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Storage Quota Card */}
      <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Google Drive Storage Allocation
              </h3>
              <p className="text-xs text-zinc-500">
                {formatBytes(totalUsedBytes)} used of 15 GB ({usedPercentage.toFixed(1)}%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="dashboard-upload-input"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition active:scale-95 min-h-[44px]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload File</span>
              <input
                id="dashboard-upload-input"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        {/* Dynamic Multi-Segment Progress Bar */}
        <div className="h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${Math.max(2, (driveBytes / TOTAL_QUOTA) * 100 * 4)}%` }}
            title={`Drive Files: ${formatBytes(driveBytes)}`}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${Math.max(2, (vaultBytes / TOTAL_QUOTA) * 100 * 4)}%` }}
            title={`Encrypted Vault: ${formatBytes(vaultBytes)}`}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-500"
            style={{ width: `${Math.max(2, (duplicateBytes / TOTAL_QUOTA) * 100 * 4)}%` }}
            title={`Duplicate Waste: ${formatBytes(duplicateBytes)}`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
            <span className="text-zinc-500">Drive Files:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatBytes(driveBytes)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span className="text-zinc-500">Encrypted:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatBytes(vaultBytes)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <span className="text-zinc-500">Duplicates:</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">{formatBytes(duplicateBytes)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />
            <span className="text-zinc-500">Free:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {formatBytes(TOTAL_QUOTA - totalUsedBytes)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Access Action Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => onSelectTab('vault')}
          className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/40 text-left transition group shadow-xs min-h-[96px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-105 transition">
              <Lock className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
              {vaultFiles.length}
            </span>
          </div>
          <div className="mt-2">
            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">Privacy Vault</h4>
            <p className="text-[11px] text-zinc-500 truncate">AES-256 Zero-Knowledge</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('duplicates')}
          className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/40 text-left transition group shadow-xs min-h-[96px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 group-hover:scale-105 transition">
              <Copy className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
              {formatBytes(duplicateBytes)}
            </span>
          </div>
          <div className="mt-2">
            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">Duplicate Cleaner</h4>
            <p className="text-[11px] text-zinc-500 truncate">Reclaim free storage</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('search')}
          className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/40 text-left transition group shadow-xs min-h-[96px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 group-hover:scale-105 transition">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">
              AI Powered
            </span>
          </div>
          <div className="mt-2">
            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">Semantic Search</h4>
            <p className="text-[11px] text-zinc-500 truncate">Natural language query</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('offline')}
          className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/40 text-left transition group shadow-xs min-h-[96px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:scale-105 transition">
              <HardDrive className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {files.filter(f => f.isOffline).length}
            </span>
          </div>
          <div className="mt-2">
            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">Offline Pinned</h4>
            <p className="text-[11px] text-zinc-500 truncate">Cached locally</p>
          </div>
        </button>
      </div>

      {/* File Explorer Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'document', label: 'Documents' },
            { id: 'image', label: 'Images' },
            { id: 'spreadsheet', label: 'Sheets' },
            { id: 'starred', label: 'Starred' },
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition min-h-[38px] whitespace-nowrap ${
                filterCategory === cat.id
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <input
            type="text"
            placeholder="Quick filter..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[38px] w-36 sm:w-44"
          />

          <div className="flex items-center p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition min-h-[36px] min-w-[36px] flex items-center justify-center ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition min-h-[36px] min-w-[36px] flex items-center justify-center ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Files Display: Grid or Table */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <Folder className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No files match your filters</p>
          <p className="text-xs text-zinc-500 mt-1">Try clearing the quick filter search input or changing category.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map(file => (
            <div
              key={file.id}
              className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition flex flex-col justify-between group"
            >
              {/* Dynamic Scaling Thumbnail Area */}
              <div
                onClick={() => onSelectPreviewFile(file)}
                className="cursor-pointer relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center"
              >
                {file.thumbnailUrl ? (
                  <img
                    src={file.thumbnailUrl}
                    alt={file.name}
                    width={400}
                    height={225}
                    decoding="async"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-400">
                    {file.category === 'spreadsheet' ? (
                      <Table className="w-10 h-10 text-emerald-500" />
                    ) : file.category === 'archive' ? (
                      <Archive className="w-10 h-10 text-amber-500" />
                    ) : (
                      <FileText className="w-10 h-10 text-blue-500" />
                    )}
                    <span className="text-[10px] font-mono mt-1 text-zinc-400 uppercase">
                      {file.mimeType.split('/')[1]?.slice(0, 8) || file.category}
                    </span>
                  </div>
                )}

                {/* Badges Overlay */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {file.isEncrypted && (
                    <span className="p-1 rounded-md bg-amber-500 text-white shadow-xs">
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                  {file.isOffline && (
                    <span className="p-1 rounded-md bg-emerald-600 text-white shadow-xs" title="Available offline">
                      <HardDrive className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onToggleStar(file.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-xs text-white hover:text-amber-300 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                  aria-label="Star file"
                >
                  <Star className={`w-3.5 h-3.5 ${file.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
              </div>

              {/* Card Footer Content */}
              <div className="p-3.5 flex flex-col justify-between flex-1">
                <div className="min-w-0">
                  <h4
                    onClick={() => onSelectPreviewFile(file)}
                    className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate cursor-pointer hover:text-blue-600 transition"
                    title={file.name}
                  >
                    {file.name}
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
                    <span>{formatBytes(file.size)}</span>
                    <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => onSelectPreviewFile(file)}
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 min-h-[36px]"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleOffline(file.id)}
                      className={`p-1.5 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center ${
                        file.isOffline
                          ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                      title={file.isOffline ? 'Offline pinned' : 'Pin for offline'}
                    >
                      <HardDrive className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteFile(file.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View: Responsive and horizontal-scroll protected */
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Size</th>
                  <th className="py-3 px-4 hidden md:table-cell">Modified</th>
                  <th className="py-3 px-4">Offline</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredFiles.map(file => (
                  <tr
                    key={file.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {file.category === 'image' ? (
                          <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                        ) : file.category === 'spreadsheet' ? (
                          <Table className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                        )}
                        <span
                          onClick={() => onSelectPreviewFile(file)}
                          className="font-semibold text-zinc-900 dark:text-zinc-100 truncate cursor-pointer hover:text-blue-600 max-w-[180px] sm:max-w-xs"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                        {file.starred && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-500 hidden sm:table-cell font-mono">
                      {formatBytes(file.size)}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 hidden md:table-cell">
                      {new Date(file.modifiedTime).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onToggleOffline(file.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium min-h-[36px] ${
                          file.isOffline
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        <HardDrive className="w-3 h-3" />
                        {file.isOffline ? 'Cached' : 'Cloud'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectPreviewFile(file)}
                          className="p-1.5 text-zinc-500 hover:text-blue-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Preview details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteFile(file.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Delete file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
