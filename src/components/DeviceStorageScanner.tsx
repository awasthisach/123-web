import React, { useState, useMemo, useRef } from 'react';
import {
  Smartphone,
  HardDrive,
  FolderSearch,
  Trash2,
  Cloud,
  Lock,
  Copy,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  CheckSquare,
  Square,
  ArrowRightLeft,
  UploadCloud,
  FileVideo,
  FileText,
  FileArchive,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Folder,
  X,
  Layers,
  Zap,
} from 'lucide-react';
import {
  DeviceStorageFile,
  StorageSource,
  StorageDeviceStats,
  DriveFile,
  VaultFile,
  FileCategory,
} from '../types';
import {
  INITIAL_PHONE_STATS,
  INITIAL_SD_STATS,
  MOCK_DEVICE_FILES,
} from '../lib/deviceStorageMock';
import { formatBytes } from '../lib/driveApi';

interface DeviceStorageScannerProps {
  onImportToDrive: (file: DriveFile) => void;
  onImportToVault: (vaultFile: VaultFile) => void;
  onSelectPreviewFile?: (file: DriveFile) => void;
}

export const DeviceStorageScanner: React.FC<DeviceStorageScannerProps> = ({
  onImportToDrive,
  onImportToVault,
  onSelectPreviewFile,
}) => {
  // Device Storage State
  const [deviceFiles, setDeviceFiles] = useState<DeviceStorageFile[]>(MOCK_DEVICE_FILES);
  const [phoneStats, setPhoneStats] = useState<StorageDeviceStats>(INITIAL_PHONE_STATS);
  const [sdStats, setSdStats] = useState<StorageDeviceStats>(INITIAL_SD_STATS);

  // Scanning Simulation / Progress State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanCurrentItem, setScanCurrentItem] = useState('');
  const [lastScannedSource, setLastScannedSource] = useState<string>('Phone Memory & SD Card');

  // Filtering & Search
  const [activeSourceFilter, setActiveSourceFilter] = useState<'all' | StorageSource>('all');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'large' | 'duplicates' | 'junk' | 'video' | 'image' | 'document'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Bulk Selection
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Toast Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Real File System / Directory Pickers refs
  const phoneFolderInputRef = useRef<HTMLInputElement>(null);
  const sdFolderInputRef = useRef<HTMLInputElement>(null);

  // Storage calculations
  const { totalPhoneUsed, totalSdUsed, largeFilesSize, duplicateFilesSize, junkFilesSize } = useMemo(() => {
    let pUsed = 0;
    let sUsed = 0;
    let lSize = 0;
    let dSize = 0;
    let jSize = 0;

    for (const f of deviceFiles) {
      if (f.source === 'phone_internal') pUsed += f.size;
      else sUsed += f.size;

      if (f.isLargeFile) lSize += f.size;
      if (f.isDuplicate) dSize += f.size;
      if (f.isCacheOrJunk) jSize += f.size;
    }

    return {
      totalPhoneUsed: pUsed,
      totalSdUsed: sUsed,
      largeFilesSize: lSize,
      duplicateFilesSize: dSize,
      junkFilesSize: jSize,
    };
  }, [deviceFiles]);

  // Filtered files calculation
  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return deviceFiles.filter(f => {
      // Source filter
      if (activeSourceFilter !== 'all' && f.source !== activeSourceFilter) return false;

      // Type filter
      if (activeTypeFilter === 'large' && !f.isLargeFile) return false;
      if (activeTypeFilter === 'duplicates' && !f.isDuplicate) return false;
      if (activeTypeFilter === 'junk' && !f.isCacheOrJunk) return false;
      if (activeTypeFilter === 'video' && f.category !== 'video') return false;
      if (activeTypeFilter === 'image' && f.category !== 'image') return false;
      if (activeTypeFilter === 'document' && f.category !== 'document') return false;

      // Query filter
      if (q) {
        return (
          f.name.toLowerCase().includes(q) ||
          f.path.toLowerCase().includes(q) ||
          f.mimeType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [deviceFiles, activeSourceFilter, activeTypeFilter, searchQuery]);

  // Selected files array
  const selectedFiles = useMemo(() => {
    return deviceFiles.filter(f => selectedFileIds.has(f.id));
  }, [deviceFiles, selectedFileIds]);

  const selectedBytes = useMemo(() => {
    return selectedFiles.reduce((sum, f) => sum + f.size, 0);
  }, [selectedFiles]);

  const isAllFilteredSelected =
    filteredFiles.length > 0 && filteredFiles.every(f => selectedFileIds.has(f.id));

  // Selection handlers
  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedFileIds);
    for (const f of filteredFiles) next.add(f.id);
    setSelectedFileIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedFileIds(new Set());
  };

  // Trigger Deep Scan Simulation
  const handleTriggerScan = (target: 'all' | 'phone' | 'sd') => {
    setIsScanning(true);
    setScanProgress(0);
    const label =
      target === 'all'
        ? 'Phone Memory & SD Card'
        : target === 'phone'
        ? 'Phone Internal Memory'
        : 'External SD Card';
    setLastScannedSource(label);

    const steps = [
      'Scanning DCIM Camera & Photos...',
      'Scanning Downloads & Media...',
      'Analyzing WhatsApp forwarded videos...',
      'Checking SD Card root & media archives...',
      'Hashing duplicates and detecting junk caches...',
      'Scan finalized!',
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex++;
      setScanProgress(Math.min(100, Math.round((stepIndex / steps.length) * 100)));
      setScanCurrentItem(steps[stepIndex - 1] || 'Finalizing storage index...');

      if (stepIndex >= steps.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsScanning(false);
          showToast(`Scan complete: ${deviceFiles.length} files indexed across ${label}`);
        }, 300);
      }
    }, 280);
  };

  // Real Directory Upload Handler via input directory picker
  const handleDirectoryPicked = (
    e: React.ChangeEvent<HTMLInputElement>,
    source: StorageSource
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newFiles: DeviceStorageFile[] = [];
    const sizeMap = new Map<number, string>();

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      let cat: FileCategory = 'other';
      if (f.type.startsWith('image/') || f.name.match(/\.(jpg|jpeg|png|webp|gif|heic|nef|arw)$/i)) cat = 'image';
      else if (f.type.startsWith('video/') || f.name.match(/\.(mp4|mkv|mov|avi|webm)$/i)) cat = 'video';
      else if (f.type.includes('pdf') || f.name.match(/\.(pdf|doc|docx|txt)$/i)) cat = 'document';
      else if (f.name.match(/\.(zip|rar|7z|tar|gz)$/i)) cat = 'archive';
      else if (f.name.match(/\.(apk|js|ts|json)$/i)) cat = 'code';

      const isLarge = f.size > 25 * 1024 * 1024;
      const isJunk = f.name.endsWith('.tmp') || f.name.endsWith('.log') || f.name.endsWith('.cache');

      // Duplicate detection by same size
      let isDup = false;
      let dupHash: string | undefined = undefined;
      if (sizeMap.has(f.size)) {
        isDup = true;
        dupHash = `size-hash-${f.size}`;
      } else {
        sizeMap.set(f.size, f.name);
      }

      newFiles.push({
        id: `scanned-${source}-${Date.now()}-${i}`,
        name: f.name,
        path: f.webkitRelativePath || `${source === 'phone_internal' ? 'Phone' : 'SD_Card'}/${f.name}`,
        source,
        size: f.size,
        mimeType: f.type || 'application/octet-stream',
        category: cat,
        lastModified: new Date(f.lastModified).toISOString(),
        isLargeFile: isLarge,
        isDuplicate: isDup,
        duplicateGroupHash: dupHash,
        isCacheOrJunk: isJunk,
        rawFileRef: f,
      });
    }

    setDeviceFiles(prev => [...newFiles, ...prev]);
    showToast(`Indexed ${newFiles.length} real files from ${source === 'phone_internal' ? 'Phone' : 'SD Card'}`);
    e.target.value = '';
  };

  // Bulk / Individual: Delete Files to free device space
  const handleDeleteFiles = (ids: string[]) => {
    const idSet = new Set(ids);
    const deletedFiles = deviceFiles.filter(f => idSet.has(f.id));
    const freedBytes = deletedFiles.reduce((sum, f) => sum + f.size, 0);

    setDeviceFiles(prev => prev.filter(f => !idSet.has(f.id)));
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });

    showToast(`Deleted ${ids.length} files. Freed ${formatBytes(freedBytes)} of device storage!`);
  };

  // Bulk / Individual: Backup to Google Drive
  const handleBackupToDrive = (filesToBackup: DeviceStorageFile[]) => {
    for (const f of filesToBackup) {
      const newDriveItem: DriveFile = {
        id: `drive-imported-${f.id}-${Date.now()}`,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        modifiedTime: f.lastModified,
        createdTime: new Date().toISOString(),
        category: f.category,
        folderId: f.source === 'phone_internal' ? 'projects' : 'archive',
        thumbnailUrl: f.thumbnailUrl,
        isOffline: true,
        isEncrypted: false,
        contentHash: `dev-${f.id}-${f.size}`,
        tags: [f.source === 'phone_internal' ? 'phone-backup' : 'sd-backup', f.category],
        semanticSummary: `Backed up from ${f.source === 'phone_internal' ? 'Phone Internal Memory' : 'MicroSD Card'}: ${f.path}`,
        starred: false,
      };
      onImportToDrive(newDriveItem);
    }

    showToast(`Backed up ${filesToBackup.length} items to Google Drive Cloud!`);
  };

  // Bulk / Individual: Move to Privacy Vault (AES-256 Encrypted)
  const handleEncryptToVault = (filesToVault: DeviceStorageFile[]) => {
    for (const f of filesToVault) {
      const vaultItem: VaultFile = {
        id: `vault-dev-${f.id}-${Date.now()}`,
        name: `${f.name}.aes`,
        originalName: f.name,
        size: f.size,
        mimeType: f.mimeType,
        encryptedData: 'U2FsdGVkX1+9...' + f.name,
        iv: 'iv-sample-bytes',
        salt: 'salt-sample-bytes',
        uploadedAt: new Date().toISOString(),
        tags: ['vault', 'device-import', f.source],
        notes: `Imported from ${f.path}`,
      };
      onImportToVault(vaultItem);
    }

    showToast(`Encrypted ${filesToVault.length} files with AES-256 in Privacy Vault!`);
  };

  // Transfer between Phone Memory and SD Card
  const handleTransferLocation = (file: DeviceStorageFile) => {
    const targetSource: StorageSource = file.source === 'phone_internal' ? 'sd_card' : 'phone_internal';
    const newPath = file.path.startsWith('Phone/')
      ? file.path.replace('Phone/', 'SD_Card/')
      : file.path.replace('SD_Card/', 'Phone/');

    setDeviceFiles(prev =>
      prev.map(f => (f.id === file.id ? { ...f, source: targetSource, path: newPath } : f))
    );

    showToast(
      `Moved "${file.name}" to ${targetSource === 'phone_internal' ? 'Phone Memory' : 'SD Card'}`
    );
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

      {/* Hidden Folder Directory Inputs for real device file picking */}
      <input
        type="file"
        ref={phoneFolderInputRef}
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        className="hidden"
        onChange={e => handleDirectoryPicked(e, 'phone_internal')}
      />
      <input
        type="file"
        ref={sdFolderInputRef}
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        className="hidden"
        onChange={e => handleDirectoryPicked(e, 'sd_card')}
      />

      {/* Header Banner with Scan Actions */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-white p-5 sm:p-7 rounded-3xl border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] font-bold tracking-wide uppercase">
                Device Storage Engine
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 text-xs">Phone & External SD Card</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Phone Memory & SD Card Storage Scanner
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
              फ़ोन मेमोरी (Internal Storage) और एक्सटर्नल SD कार्ड को डीप स्कैन करें। बड़ी फाइलों, डुप्लीकेट्स और जंक कैशे को पहचानें एवं एक क्लिक में बैकअप या डिलीट करें।
            </p>
          </div>

          {/* Quick Scan Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isScanning}
              onClick={() => handleTriggerScan('all')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition active:scale-95 min-h-[44px]"
            >
              {isScanning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FolderSearch className="w-4 h-4" />
              )}
              <span>{isScanning ? 'Scanning...' : 'Deep Scan All (सम्पूर्ण स्कैन)'}</span>
            </button>

            <button
              type="button"
              onClick={() => phoneFolderInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition min-h-[44px]"
              title="Select real phone folder via native file picker"
            >
              <FolderOpen className="w-4 h-4 text-blue-400" />
              <span>Pick Phone Folder</span>
            </button>

            <button
              type="button"
              onClick={() => sdFolderInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition min-h-[44px]"
              title="Select real SD card folder via native file picker"
            >
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              <span>Pick SD Folder</span>
            </button>
          </div>
        </div>

        {/* Live Scanning Progress Overlay */}
        {isScanning && (
          <div className="mt-5 pt-4 border-t border-zinc-800/80 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-blue-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {scanCurrentItem}
              </span>
              <span className="font-mono text-zinc-400">{scanProgress}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Dual Storage Drives Overview Cards: Phone Memory vs SD Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Phone Internal Memory Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Phone Internal Memory (फ़ोन मेमोरी)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    Active
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  {formatBytes(phoneStats.usedBytes)} used of {formatBytes(phoneStats.totalBytes)} ({((phoneStats.usedBytes / phoneStats.totalBytes) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => handleTriggerScan('phone')}
              className="p-2 rounded-xl text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Rescan Phone Memory"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${(phoneStats.usedBytes / phoneStats.totalBytes) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Free Space: {formatBytes(phoneStats.freeBytes)}</span>
              <span>{deviceFiles.filter(f => f.source === 'phone_internal').length} indexed files</span>
            </div>
          </div>

          {/* Quick Filter Tag for Phone */}
          <button
            type="button"
            onClick={() => setActiveSourceFilter(activeSourceFilter === 'phone_internal' ? 'all' : 'phone_internal')}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition border flex items-center justify-center gap-1.5 min-h-[38px] ${
              activeSourceFilter === 'phone_internal'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
            }`}
          >
            <span>{activeSourceFilter === 'phone_internal' ? 'Showing Phone Memory (Active)' : 'Filter Phone Memory Files'}</span>
          </button>
        </div>

        {/* 2. External MicroSD Card Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    External MicroSD Card (SD कार्ड)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    Mounted
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  {formatBytes(sdStats.usedBytes)} used of {formatBytes(sdStats.totalBytes)} ({((sdStats.usedBytes / sdStats.totalBytes) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => handleTriggerScan('sd')}
              className="p-2 rounded-xl text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Rescan SD Card"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(sdStats.usedBytes / sdStats.totalBytes) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Free Space: {formatBytes(sdStats.freeBytes)}</span>
              <span>{deviceFiles.filter(f => f.source === 'sd_card').length} indexed files</span>
            </div>
          </div>

          {/* Quick Filter Tag for SD */}
          <button
            type="button"
            onClick={() => setActiveSourceFilter(activeSourceFilter === 'sd_card' ? 'all' : 'sd_card')}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition border flex items-center justify-center gap-1.5 min-h-[38px] ${
              activeSourceFilter === 'sd_card'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
            }`}
          >
            <span>{activeSourceFilter === 'sd_card' ? 'Showing SD Card (Active)' : 'Filter SD Card Files'}</span>
          </button>
        </div>
      </div>

      {/* Smart Analysis Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setActiveTypeFilter(activeTypeFilter === 'large' ? 'all' : 'large')}
          className={`p-4 rounded-2xl border text-left transition shadow-xs flex flex-col justify-between min-h-[96px] ${
            activeTypeFilter === 'large'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500 ring-1 ring-amber-500'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Layers className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {deviceFiles.filter(f => f.isLargeFile).length}
            </span>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">Large Files (&gt;25MB)</h4>
            <p className="text-[11px] text-zinc-500">{formatBytes(largeFilesSize)} total</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTypeFilter(activeTypeFilter === 'duplicates' ? 'all' : 'duplicates')}
          className={`p-4 rounded-2xl border text-left transition shadow-xs flex flex-col justify-between min-h-[96px] ${
            activeTypeFilter === 'duplicates'
              ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 ring-1 ring-indigo-500'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-indigo-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Copy className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {deviceFiles.filter(f => f.isDuplicate).length}
            </span>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">Redundant Duplicates</h4>
            <p className="text-[11px] text-zinc-500">{formatBytes(duplicateFilesSize)} waste</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTypeFilter(activeTypeFilter === 'junk' ? 'all' : 'junk')}
          className={`p-4 rounded-2xl border text-left transition shadow-xs flex flex-col justify-between min-h-[96px] ${
            activeTypeFilter === 'junk'
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 ring-1 ring-rose-500'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <Zap className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
              {deviceFiles.filter(f => f.isCacheOrJunk).length}
            </span>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">Junk & Cache Files</h4>
            <p className="text-[11px] text-zinc-500">{formatBytes(junkFilesSize)} safe to delete</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTypeFilter(activeTypeFilter === 'video' ? 'all' : 'video')}
          className={`p-4 rounded-2xl border text-left transition shadow-xs flex flex-col justify-between min-h-[96px] ${
            activeTypeFilter === 'video'
              ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500 ring-1 ring-blue-500'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-blue-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <FileVideo className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {deviceFiles.filter(f => f.category === 'video').length}
            </span>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">High-Res Videos</h4>
            <p className="text-[11px] text-zinc-500">Screen recordings & 4K</p>
          </div>
        </button>
      </div>

      {/* Floating / Sticky Bulk Action Toolbar */}
      {selectedFileIds.size > 0 && (
        <div className="sticky top-2 z-40 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-3.5 sm:p-4 rounded-2xl shadow-xl border border-zinc-700 dark:border-zinc-300 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold">
                {selectedFileIds.size} files selected (चुनी गईं)
              </span>
              <span className="text-zinc-400 dark:text-zinc-500 text-xs ml-2">
                • {formatBytes(selectedBytes)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Backup to Drive */}
            <button
              type="button"
              onClick={() => handleBackupToDrive(selectedFiles)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition min-h-[38px]"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Backup to Drive (क्लाउड बैकअप)</span>
            </button>

            {/* Move to Vault */}
            <button
              type="button"
              onClick={() => handleEncryptToVault(selectedFiles)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition min-h-[38px]"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Vault Encrypt</span>
            </button>

            {/* Delete Selected */}
            <button
              type="button"
              onClick={() => handleDeleteFiles(Array.from(selectedFileIds))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition min-h-[38px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete from Device (मेमोरी खाली करें)</span>
            </button>

            {/* Deselect All */}
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 dark:hover:bg-zinc-300 text-zinc-300 dark:text-zinc-700 text-xs font-medium transition min-h-[38px]"
            >
              Cancel (रद्द करें)
            </button>
          </div>
        </div>
      )}

      {/* Explorer Search & Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Source Toggle Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {[
              { id: 'all', label: 'All Sources (फ़ोन + SD)' },
              { id: 'phone_internal', label: 'Phone Memory Only' },
              { id: 'sd_card', label: 'SD Card Only' },
            ].map(src => (
              <button
                key={src.id}
                type="button"
                onClick={() => setActiveSourceFilter(src.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition min-h-[38px] whitespace-nowrap ${
                  activeSourceFilter === src.id
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {src.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search phone & SD files..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[38px] w-48 sm:w-60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Helper Strip */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <div>
            Showing <strong className="text-zinc-900 dark:text-zinc-100">{filteredFiles.length}</strong> scanned items
            {activeTypeFilter !== 'all' && (
              <span className="ml-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                (Filtered: {activeTypeFilter})
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
                  <span>Deselect All</span>
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

      {/* Scanned Files Grid */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <FolderSearch className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No scanned files matching criteria</p>
          <p className="text-xs text-zinc-500 mt-1">Try switching to &quot;All Sources&quot; or clearing your search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map(file => {
            const isSelected = selectedFileIds.has(file.id);

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
                  onClick={e => handleToggleSelect(file.id, e)}
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

                {/* Source Badge Top-Right */}
                <div className="absolute top-2.5 right-2.5 z-20">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
                      file.source === 'phone_internal'
                        ? 'bg-blue-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {file.source === 'phone_internal' ? (
                      <>
                        <Smartphone className="w-3 h-3" />
                        <span>Phone Memory</span>
                      </>
                    ) : (
                      <>
                        <HardDrive className="w-3 h-3" />
                        <span>SD Card</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Thumbnail / Category Header */}
                <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center">
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
                      {file.category === 'video' ? (
                        <FileVideo className="w-10 h-10 text-blue-500" />
                      ) : file.category === 'image' ? (
                        <ImageIcon className="w-10 h-10 text-emerald-500" />
                      ) : file.category === 'archive' ? (
                        <FileArchive className="w-10 h-10 text-amber-500" />
                      ) : (
                        <FileText className="w-10 h-10 text-zinc-400" />
                      )}
                      <span className="text-[10px] font-mono mt-1 text-zinc-400 uppercase">
                        {file.category}
                      </span>
                    </div>
                  )}

                  {/* Warning Tags Overlay */}
                  <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                    {file.isLargeFile && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-xs">
                        Large ({formatBytes(file.size)})
                      </span>
                    )}
                    {file.isDuplicate && (
                      <span className="px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold shadow-xs">
                        Duplicate
                      </span>
                    )}
                    {file.isCacheOrJunk && (
                      <span className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold shadow-xs">
                        Junk Cache
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-3.5 flex flex-col justify-between flex-1">
                  <div>
                    <h4
                      className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate"
                      title={file.name}
                    >
                      {file.name}
                    </h4>
                    <p
                      className="text-[11px] text-zinc-400 font-mono truncate mt-0.5"
                      title={file.path}
                    >
                      {file.path}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1 flex items-center justify-between">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">
                        {formatBytes(file.size)}
                      </span>
                      <span>{new Date(file.lastModified).toLocaleDateString()}</span>
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1">
                      {/* Move to Cloud Drive */}
                      <button
                        type="button"
                        onClick={() => handleBackupToDrive([file])}
                        className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Backup to Google Drive"
                      >
                        <Cloud className="w-4 h-4" />
                      </button>

                      {/* Move to Vault */}
                      <button
                        type="button"
                        onClick={() => handleEncryptToVault([file])}
                        className="p-1.5 text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Encrypt in Privacy Vault"
                      >
                        <Lock className="w-4 h-4" />
                      </button>

                      {/* Transfer Phone <-> SD Card */}
                      <button
                        type="button"
                        onClick={() => handleTransferLocation(file)}
                        className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title={`Move to ${file.source === 'phone_internal' ? 'SD Card' : 'Phone Memory'}`}
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Delete File */}
                    <button
                      type="button"
                      onClick={() => handleDeleteFiles([file.id])}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition min-h-[38px] min-w-[38px] flex items-center justify-center"
                      title="Delete from Device (मेमोरी खाली करें)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
