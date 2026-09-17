import React, { useState, useMemo, useEffect } from 'react';
import {
  Folder,
  FolderPlus,
  FolderInput,
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
  LayoutGrid,
  List,
  Eye,
  CheckCircle2,
  Cloud,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Search,
  ArrowRight,
  Smartphone,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { DriveFile, FileCategory, VaultFile, FolderItem } from '../types';
import { formatBytes } from '../lib/driveApi';
import { MoveToFolderModal } from './MoveToFolderModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface DashboardProps {
  files: DriveFile[];
  folders: FolderItem[];
  vaultFiles: VaultFile[];
  onUploadFile: (newFile: DriveFile) => void;
  onDeleteFile: (id: string) => void;
  onDeleteMultipleFiles: (ids: string[]) => void;
  onMoveFilesToFolder: (fileIds: string[], targetFolderId: string | undefined) => void;
  onCreateFolder: (newFolder: FolderItem) => void;
  onToggleStar: (id: string) => void;
  onToggleOffline: (id: string) => void;
  onSelectTab: (tab: string) => void;
  onSelectPreviewFile: (file: DriveFile) => void;
  isGoogleConnected?: boolean;
  isGoogleLoading?: boolean;
  googleUserEmail?: string;
  onConnectGoogleDrive?: () => void;
  onConnectDemoDrive?: () => void;
  onSyncGoogleDrive?: () => void;
}

const FOLDER_COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  blue: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  purple: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
  amber: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  rose: { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
  zinc: { bg: 'bg-zinc-500/10 dark:bg-zinc-500/20', text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-500/30' },
};

export const Dashboard: React.FC<DashboardProps> = ({
  files,
  folders,
  vaultFiles,
  onUploadFile,
  onDeleteFile,
  onDeleteMultipleFiles,
  onMoveFilesToFolder,
  onCreateFolder,
  onToggleStar,
  onToggleOffline,
  onSelectTab,
  onSelectPreviewFile,
  isGoogleConnected = false,
  isGoogleLoading = false,
  googleUserEmail = '',
  onConnectGoogleDrive,
  onConnectDemoDrive,
  onSyncGoogleDrive,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk Selection State
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Modals state
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveTargetFiles, setMoveTargetFiles] = useState<DriveFile[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetFiles, setDeleteTargetFiles] = useState<DriveFile[]>([]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Folder lookup map for fast folder name & color lookup
  const folderMap = useMemo(() => {
    const map = new Map<string, FolderItem>();
    for (const f of folders) {
      map.set(f.id, f);
    }
    return map;
  }, [folders]);

  // Storage calculations
  const TOTAL_QUOTA = 15 * 1024 * 1024 * 1024; // 15 GB
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

  // Filtered files
  const filteredFiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return files.filter(file => {
      // Folder filter
      if (selectedFolderId === 'root') {
        if (file.folderId && file.folderId !== 'root') return false;
      } else if (selectedFolderId !== 'all') {
        if (file.folderId !== selectedFolderId) return false;
      }

      // Category filter
      if (filterCategory === 'starred' && !file.starred) return false;
      if (filterCategory === 'vault' && !file.isEncrypted) return false;
      if (filterCategory === 'google_drive' && !file.isGoogleDriveItem) return false;
      if (
        filterCategory !== 'all' &&
        filterCategory !== 'starred' &&
        filterCategory !== 'vault' &&
        filterCategory !== 'google_drive'
      ) {
        if (file.category !== filterCategory) return false;
      }

      // Search query
      if (q) {
        return (
          file.name.toLowerCase().includes(q) ||
          file.tags.some(t => t.toLowerCase().includes(q)) ||
          file.semanticSummary.toLowerCase().includes(q) ||
          (file.folderId && folderMap.get(file.folderId)?.name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [files, selectedFolderId, filterCategory, searchTerm, folderMap]);

  // Windowed pagination
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFolderId, filterCategory, searchTerm, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / itemsPerPage));
  const displayedFiles = useMemo(() => {
    if (itemsPerPage >= filteredFiles.length) return filteredFiles;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFiles.slice(start, start + itemsPerPage);
  }, [filteredFiles, currentPage, itemsPerPage]);

  // Selection handlers
  const handleToggleSelectFile = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedFileIds);
    for (const f of filteredFiles) {
      next.add(f.id);
    }
    setSelectedFileIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedFileIds(new Set());
  };

  const isAllFilteredSelected =
    filteredFiles.length > 0 && filteredFiles.every(f => selectedFileIds.has(f.id));

  // Selected files array and total size
  const selectedFilesList = useMemo(() => {
    return files.filter(f => selectedFileIds.has(f.id));
  }, [files, selectedFileIds]);

  const selectedBytes = useMemo(() => {
    return selectedFilesList.reduce((sum, f) => sum + f.size, 0);
  }, [selectedFilesList]);

  // Bulk Move
  const handleOpenBulkMove = () => {
    if (selectedFilesList.length === 0) return;
    setMoveTargetFiles(selectedFilesList);
    setIsMoveModalOpen(true);
  };

  // Single File Move
  const handleOpenSingleMove = (file: DriveFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMoveTargetFiles([file]);
    setIsMoveModalOpen(true);
  };

  const handleConfirmMove = (targetFolderId: string | undefined) => {
    const ids = moveTargetFiles.map(f => f.id);
    onMoveFilesToFolder(ids, targetFolderId);
    setIsMoveModalOpen(false);

    // Target folder name for toast
    const targetName = targetFolderId
      ? folderMap.get(targetFolderId)?.name || 'Folder'
      : 'Main Drive (Root)';
    showToast(
      `${ids.length} ${ids.length === 1 ? 'file' : 'files'} moved to '${targetName}' (फ़ोल्डर में सफलतापूर्वक मूव किया गया)`
    );

    // Clear selection of moved items
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  };

  // Bulk Delete
  const handleOpenBulkDelete = () => {
    if (selectedFilesList.length === 0) return;
    setDeleteTargetFiles(selectedFilesList);
    setIsDeleteModalOpen(true);
  };

  // Single File Delete
  const handleOpenSingleDelete = (file: DriveFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteTargetFiles([file]);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    const ids = deleteTargetFiles.map(f => f.id);
    onDeleteMultipleFiles(ids);
    setIsDeleteModalOpen(false);
    showToast(
      `${ids.length} ${ids.length === 1 ? 'file' : 'files'} deleted successfully (फ़ाइलें डिलीट कर दी गईं)`
    );

    setSelectedFileIds(prev => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  };

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
      folderId: selectedFolderId !== 'all' && selectedFolderId !== 'root' ? selectedFolderId : undefined,
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
    showToast(`"${uploaded.name}" uploaded successfully`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 shadow-2xl border border-zinc-700 dark:border-zinc-300 text-xs font-semibold animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-zinc-400 hover:text-white dark:hover:text-black"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Google Drive Status Banner */}
      {isGoogleConnected ? (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-blue-50 to-indigo-50/70 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Google Drive Live Sync
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                Active user: <strong className="text-zinc-800 dark:text-zinc-200">{googleUserEmail || 'awasthi.sach@gmail.com'}</strong> • {files.filter(f => f.isGoogleDriveItem).length} Drive files synchronized in real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSyncGoogleDrive && (
              <button
                type="button"
                onClick={onSyncGoogleDrive}
                disabled={isGoogleLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50 min-h-[38px]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGoogleLoading ? 'animate-spin text-blue-500' : ''}`} />
                <span>{isGoogleLoading ? 'Syncing Drive...' : 'Sync Drive Now (रिफ्रेश)'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-blue-50/70 to-zinc-50 dark:from-blue-950/20 dark:to-zinc-900 border border-blue-200/80 dark:border-blue-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Connect Google Drive (गूगल ड्राइव कनेक्ट करें)
              </h4>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                सीमेंटिक सर्च और फाइलों को सीधे ड्राइव फ़ोल्डर में मूव करने के लिए अपना Google Drive कनेक्ट करें।
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onConnectGoogleDrive && (
              <button
                id="dashboard-signin-google-btn"
                type="button"
                onClick={onConnectGoogleDrive}
                disabled={isGoogleLoading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm hover:shadow transition cursor-pointer min-h-[40px] disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
                <span>{isGoogleLoading ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )}

            {onConnectDemoDrive && (
              <button
                id="dashboard-connect-demo-btn"
                type="button"
                onClick={onConnectDemoDrive}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold shadow-xs transition cursor-pointer min-h-[40px]"
                title="Google Cloud सेटअप के बिना सीधे परीक्षण करें"
              >
                <span>डेमो ड्राइव (Demo Drive)</span>
              </button>
            )}
          </div>
        </div>
      )}

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

        {/* Progress Bar */}
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${Math.max(2, (driveBytes / TOTAL_QUOTA) * 100)}%` }}
            title={`Drive Files: ${formatBytes(driveBytes)}`}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${Math.max(2, (vaultBytes / TOTAL_QUOTA) * 100)}%` }}
            title={`Vault Files: ${formatBytes(vaultBytes)}`}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <button
          type="button"
          onClick={() => onSelectTab('storage_scanner')}
          className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/40 text-left transition group shadow-xs min-h-[96px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:scale-105 transition">
              <Smartphone className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full uppercase">
              Phone &amp; SD
            </span>
          </div>
          <div className="mt-2">
            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">Storage Scanner</h4>
            <p className="text-[11px] text-zinc-500 truncate">फ़ोन व SD कार्ड स्कैन</p>
          </div>
        </button>

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

      {/* Folders Directory Section */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Folders & Directories (फ़ोल्डर्स)
            </h4>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              {folders.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setMoveTargetFiles([]);
              setIsMoveModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 transition min-h-[36px]"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ New Folder</span>
          </button>
        </div>

        {/* Horizontal Scrollable Folder Chips / Mini Cards */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar pt-1">
          {/* All Files Option */}
          <button
            type="button"
            onClick={() => setSelectedFolderId('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 min-h-[42px] border ${
              selectedFolderId === 'all'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs'
                : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>All Folders ({files.length})</span>
          </button>

          {/* Root Only Option */}
          <button
            type="button"
            onClick={() => setSelectedFolderId('root')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 min-h-[42px] border ${
              selectedFolderId === 'root'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs'
                : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
            }`}
          >
            <span>Root / Unfiled ({files.filter(f => !f.folderId || f.folderId === 'root').length})</span>
          </button>

          {/* Existing Folder Chips */}
          {folders.map(folder => {
            const count = files.filter(f => f.folderId === folder.id).length;
            const isSelected = selectedFolderId === folder.id;
            const colorScheme = FOLDER_COLOR_CLASSES[folder.color] || FOLDER_COLOR_CLASSES.blue;

            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => setSelectedFolderId(folder.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 min-h-[42px] border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-600'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    folder.color === 'emerald'
                      ? 'bg-emerald-500'
                      : folder.color === 'blue'
                      ? 'bg-blue-500'
                      : folder.color === 'purple'
                      ? 'bg-purple-500'
                      : folder.color === 'amber'
                      ? 'bg-amber-500'
                      : folder.color === 'rose'
                      ? 'bg-rose-500'
                      : 'bg-zinc-400'
                  }`}
                />
                <span className="truncate max-w-[150px]">{folder.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Folder Breadcrumb Indicator */}
        {selectedFolderId !== 'all' && (
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <span className="cursor-pointer hover:underline" onClick={() => setSelectedFolderId('all')}>
                All Files
              </span>
              <ArrowRight className="w-3 h-3 text-zinc-400" />
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {selectedFolderId === 'root'
                  ? 'Root / Unfiled'
                  : folderMap.get(selectedFolderId)?.name || selectedFolderId}
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">({filteredFiles.length} files)</span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedFolderId('all')}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline"
            >
              Clear folder filter
            </button>
          </div>
        )}
      </div>

      {/* Bulk Selection Sticky Floating Action Bar */}
      {selectedFileIds.size > 0 && (
        <div className="sticky top-2 z-40 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-3 sm:p-4 rounded-2xl shadow-xl border border-zinc-700 dark:border-zinc-300 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold">
                {selectedFileIds.size} {selectedFileIds.size === 1 ? 'file' : 'files'} selected (चुनी गईं)
              </span>
              <span className="text-zinc-400 dark:text-zinc-500 text-xs ml-2">
                • {formatBytes(selectedBytes)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Move to Folder Button */}
            <button
              type="button"
              onClick={handleOpenBulkMove}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition min-h-[38px]"
            >
              <FolderInput className="w-3.5 h-3.5" />
              <span>Move to Folder (फ़ोल्डर में ले जाएँ)</span>
            </button>

            {/* Delete Selected Button */}
            <button
              type="button"
              onClick={handleOpenBulkDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition min-h-[38px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete (डिलीट करें)</span>
            </button>

            {/* Deselect All */}
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 dark:hover:bg-zinc-300 text-zinc-300 dark:text-zinc-700 text-xs font-medium transition min-h-[38px]"
            >
              Deselect All (रद्द करें)
            </button>
          </div>
        </div>
      )}

      {/* File Explorer Controls: Categories + Search & Select All */}
      <div className="space-y-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {[
              { id: 'all', label: 'All Categories' },
              { id: 'google_drive', label: 'Google Drive' },
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

          {/* Search Input & View Mode Toggle */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search files (सर्च करें)..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[38px] w-44 sm:w-56"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

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

        {/* Search Results & Quick Bulk Selection Helper Bar */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">
              {searchTerm ? (
                <>
                  Found <strong className="text-zinc-900 dark:text-zinc-100">{filteredFiles.length}</strong> matching files for &ldquo;{searchTerm}&rdquo;
                </>
              ) : (
                <>
                  Showing <strong className="text-zinc-900 dark:text-zinc-100">{filteredFiles.length}</strong> files
                </>
              )}
            </span>
            {selectedFileIds.size > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                {selectedFileIds.size} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={isAllFilteredSelected ? handleDeselectAll : handleSelectAllFiltered}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition min-h-[32px]"
            >
              {isAllFilteredSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Deselect All Results</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Select All {filteredFiles.length} (सभी चुनें)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Files Display: Grid or Table */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <Folder className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No files match your search or filter</p>
          <p className="text-xs text-zinc-500 mt-1">Try changing folder, search term, or categories.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedFiles.map(file => {
            const isSelected = selectedFileIds.has(file.id);
            const assignedFolder = file.folderId ? folderMap.get(file.folderId) : undefined;
            const folderColorScheme = assignedFolder
              ? FOLDER_COLOR_CLASSES[assignedFolder.color] || FOLDER_COLOR_CLASSES.blue
              : null;

            return (
              <div
                key={file.id}
                className={`rounded-2xl bg-white dark:bg-zinc-900 border transition flex flex-col justify-between group relative overflow-hidden ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500 shadow-md bg-blue-50/20 dark:bg-blue-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* Checkbox Trigger Top-Left */}
                <div
                  onClick={e => handleToggleSelectFile(file.id, e)}
                  className="absolute top-2.5 left-2.5 z-20 cursor-pointer p-1 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-xs transition"
                  title={isSelected ? 'Deselect file' : 'Select file'}
                >
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-md border-2 border-white/80 group-hover:border-white transition" />
                  )}
                </div>

                {/* Star Button Top-Right */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onToggleStar(file.id);
                  }}
                  className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full bg-black/40 backdrop-blur-xs text-white hover:text-amber-300 transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                  aria-label="Star file"
                >
                  <Star className={`w-3.5 h-3.5 ${file.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>

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
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {file.isEncrypted && (
                      <span className="p-1 rounded-md bg-amber-500 text-white shadow-xs" title="Encrypted">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                    {file.isOffline && (
                      <span className="p-1 rounded-md bg-emerald-600 text-white shadow-xs" title="Available offline">
                        <HardDrive className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content & Folder Tag */}
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

                    {/* Folder Badge Indicator & Drive Tag */}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {file.isGoogleDriveItem && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <Cloud className="w-2.5 h-2.5" /> Drive
                        </span>
                      )}
                      {assignedFolder && folderColorScheme ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${folderColorScheme.bg} ${folderColorScheme.text} ${folderColorScheme.border} truncate max-w-[170px]`}
                          title={`Folder: ${assignedFolder.name}`}
                        >
                          <Folder className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{assignedFolder.name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                          <HardDrive className="w-2.5 h-2.5" />
                          <span>Root</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => onSelectPreviewFile(file)}
                      className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 min-h-[36px]"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Open in Google Drive */}
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="p-1.5 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                          title="Open directly in Google Drive"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {/* Move to Folder Button */}
                      <button
                        type="button"
                        onClick={e => handleOpenSingleMove(file, e)}
                        className="p-1.5 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Move to folder (फ़ोल्डर में ले जाएँ)"
                      >
                        <FolderInput className="w-4 h-4" />
                      </button>

                      {/* Toggle Offline */}
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

                      {/* Delete File */}
                      <button
                        type="button"
                        onClick={e => handleOpenSingleDelete(file, e)}
                        className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Delete file (डिलीट करें)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View: Responsive with Selection and Folder indicators */
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={isAllFilteredSelected ? handleDeselectAll : handleSelectAllFiltered}
                      className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                      title={isAllFilteredSelected ? 'Deselect all' : 'Select all'}
                    >
                      {isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Folder</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Size</th>
                  <th className="py-3 px-4 hidden md:table-cell">Modified</th>
                  <th className="py-3 px-4">Offline</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {displayedFiles.map(file => {
                  const isSelected = selectedFileIds.has(file.id);
                  const assignedFolder = file.folderId ? folderMap.get(file.folderId) : undefined;
                  const folderColorScheme = assignedFolder
                    ? FOLDER_COLOR_CLASSES[assignedFolder.color] || FOLDER_COLOR_CLASSES.blue
                    : null;

                  return (
                    <tr
                      key={file.id}
                      className={`transition group ${
                        isSelected
                          ? 'bg-blue-50/60 dark:bg-blue-950/30'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => handleToggleSelectFile(file.id)}
                          className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
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
                          {file.isGoogleDriveItem && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                              <Cloud className="w-2.5 h-2.5" />
                            </span>
                          )}
                          {file.starred && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        {assignedFolder && folderColorScheme ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${folderColorScheme.bg} ${folderColorScheme.text} ${folderColorScheme.border}`}
                          >
                            <Folder className="w-3 h-3" />
                            <span>{assignedFolder.name}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">Root</span>
                        )}
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
                          {/* Open in Drive if available */}
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 text-zinc-500 hover:text-blue-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                              title="Open directly in Google Drive"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {/* Move Single File */}
                          <button
                            type="button"
                            onClick={e => handleOpenSingleMove(file, e)}
                            className="p-1.5 text-zinc-500 hover:text-blue-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Move to folder (फ़ोल्डर में ले जाएँ)"
                          >
                            <FolderInput className="w-4 h-4" />
                          </button>
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
                            onClick={e => handleOpenSingleDelete(file, e)}
                            className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Delete file (डिलीट करें)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* High-Performance Windowing & Pagination Controller */}
      {filteredFiles.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span>
              Showing{' '}
              <strong className="text-zinc-900 dark:text-zinc-200">
                {Math.min((currentPage - 1) * itemsPerPage + 1, filteredFiles.length)}–
                {Math.min(currentPage * itemsPerPage, filteredFiles.length)}
              </strong>{' '}
              of <strong className="text-zinc-900 dark:text-zinc-200">{filteredFiles.length}</strong> items
            </span>
            <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">|</span>
            <div className="flex items-center gap-1">
              <span>Per page:</span>
              {[12, 24, 48].map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setItemsPerPage(size)}
                  className={`px-2 py-0.5 rounded-md font-medium transition min-h-[28px] ${
                    itemsPerPage === size
                      ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs font-semibold transition flex items-center justify-center ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Move to Folder Modal */}
      <MoveToFolderModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        selectedFiles={moveTargetFiles}
        folders={folders}
        allFiles={files}
        onConfirmMove={handleConfirmMove}
        onCreateFolder={onCreateFolder}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        filesToDelete={deleteTargetFiles}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};
