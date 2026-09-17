import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Folder,
  HardDrive,
  Shield,
  Copy,
  Sparkles,
  Cloud,
  Smartphone,
  Tablet,
  Monitor,
  RotateCw,
  Maximize2,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Lock,
  Plus,
  RefreshCw,
  Crosshair,
  Touchpad,
  Menu,
  X,
  Sliders,
  Zap,
} from 'lucide-react';
import { DriveFile, VaultFile, SyncStats, DeviceProfile, DeviceOrientation, FolderItem } from './types';
import { INITIAL_FILES, INITIAL_FOLDERS } from './lib/driveApi';
import { EMULATOR_DEVICES } from './lib/devices';
import { Dashboard } from './components/Dashboard';
import { SyncStatusBadge } from './components/SyncStatusBadge';
import { Login } from './components/Login';
import { EmulatorToolbar } from './components/EmulatorToolbar';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MoveToFolderModal } from './components/MoveToFolderModal';
import { initAuth, googleSignIn, googleSignOut, getAccessToken } from './lib/firebaseAuth';
import {
  fetchGoogleDriveData,
  moveGoogleDriveFile,
  createGoogleDriveFolder,
  deleteGoogleDriveFile,
} from './lib/googleDriveService';

// Lazy-loaded code-split components for optimal FCP and TTI
const DeviceStorageScanner = React.lazy(() => import('./components/DeviceStorageScanner').then(m => ({ default: m.DeviceStorageScanner })));
const PrivacyVault = React.lazy(() => import('./components/PrivacyVault').then(m => ({ default: m.PrivacyVault })));
const DuplicateFinder = React.lazy(() => import('./components/DuplicateFinder').then(m => ({ default: m.DuplicateFinder })));
const SemanticSearch = React.lazy(() => import('./components/SemanticSearch').then(m => ({ default: m.SemanticSearch })));
const OfflineFilesList = React.lazy(() => import('./components/OfflineFilesList').then(m => ({ default: m.OfflineFilesList })));
const ResponsiveAuditReport = React.lazy(() => import('./components/ResponsiveAuditReport').then(m => ({ default: m.ResponsiveAuditReport })));
const FilePreviewModal = React.lazy(() => import('./components/FilePreviewModal').then(m => ({ default: m.FilePreviewModal })));

const TabLoadingFallback = () => (
  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 space-y-4 animate-pulse">
    <div className="h-6 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
    <div className="h-20 w-full bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
      <div className="h-32 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
      <div className="h-32 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
      <div className="h-32 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
    </div>
  </div>
);

export default function App() {
  // Files and Vault State
  const [files, setFiles] = useState<DriveFile[]>(INITIAL_FILES);
  const [folders, setFolders] = useState<FolderItem[]>(INITIAL_FOLDERS);
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([
    {
      id: 'vault-init-1',
      name: 'Client_Contracts_Master_Vault.aes',
      originalName: 'Client_Contracts_Master_Vault.docx',
      size: 3100000,
      mimeType: 'application/octet-stream',
      encryptedData: 'U2FsdGVkX1+vupppZksvRf5pq5g5XwbOSxxW8J+DvlY8L0r73...',
      iv: 'x3f8a0b1c2d3e4f5',
      salt: 'a1b2c3d4e5f6a7b8',
      uploadedAt: '2026-09-10T16:00:00Z',
      tags: ['vault', 'contracts', 'legal'],
      notes: 'Master Enterprise SLA and non-disclosure clauses',
    },
  ]);

  // Google Drive Live Integration State
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [searchMoveTargetFile, setSearchMoveTargetFile] = useState<DriveFile | null>(null);
  const [driveNotification, setDriveNotification] = useState<string | null>(null);

  const showDriveToast = (msg: string) => {
    setDriveNotification(msg);
    setTimeout(() => {
      setDriveNotification(null);
    }, 4500);
  };

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'storage_scanner' | 'vault' | 'duplicates' | 'search' | 'offline'>('dashboard');
  const [activeViewMode, setActiveViewMode] = useState<'emulator' | 'native' | 'audit_report'>('emulator');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Device Emulator State
  const [currentDevice, setCurrentDevice] = useState<DeviceProfile>(EMULATOR_DEVICES[0]); // iPhone 15 Pro
  const [orientation, setOrientation] = useState<DeviceOrientation>('portrait');
  const [zoomScale, setZoomScale] = useState<number>(0.85);
  const [dpr, setDpr] = useState<number>(3);
  const [showOverflowInspector, setShowOverflowInspector] = useState(false);
  const [showTouchTargetAudit, setShowTouchTargetAudit] = useState(false);

  // Device Emulator Auto-Reload & Style Recalculation State
  const [autoReloadOnConfigChange, setAutoReloadOnConfigChange] = useState<boolean>(true);
  const [isReloadingEmulator, setIsReloadingEmulator] = useState<boolean>(false);
  const [emulatorReloadKey, setEmulatorReloadKey] = useState<number>(0);
  const [lastReloadTimestamp, setLastReloadTimestamp] = useState<string>('');

  const handleReloadEmulator = useCallback(() => {
    setIsReloadingEmulator(true);
    setEmulatorReloadKey(prev => prev + 1);

    // Reset container scroll position immediately on reload
    const scrollContainer = document.getElementById('device-screen-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }

    // Force browser layout engine recalculations via global window resize & orientationchange events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('orientationchange'));
    }

    // Allow DOM to settle and recalculate styles cleanly
    const timer = setTimeout(() => {
      setIsReloadingEmulator(false);
      setLastReloadTimestamp(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('resize'));
      }
    }, 220);

    return () => clearTimeout(timer);
  }, []);

  // Automatically reload emulator view whenever device configuration (orientation or device) changes
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (autoReloadOnConfigChange) {
      handleReloadEmulator();
    }
  }, [currentDevice.id, orientation, autoReloadOnConfigChange, handleReloadEmulator]);

  // Sync Stats State
  const [syncStats, setSyncStats] = useState<SyncStats>({
    status: 'synced',
    lastSynced: new Date().toISOString(),
    pendingCount: 0,
    totalSyncedCount: INITIAL_FILES.length,
    bandwidthUsage: '142 KB/s',
    networkOnline: true,
  });

  // Modal Preview
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);

  // User Profile
  const [userProfile, setUserProfile] = useState({
    name: 'Awasthi Sach',
    email: 'awasthi.sach@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    isConnected: false,
  });

  // Google Drive Auth Listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setIsGoogleConnected(true);
        setGoogleAccessToken(token);
        setUserProfile({
          name: user.displayName || 'Google Drive User',
          email: user.email || 'awasthi.sach@gmail.com',
          avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          isConnected: true,
        });

        try {
          setIsGoogleLoading(true);
          const driveData = await fetchGoogleDriveData(token);
          if (driveData.files.length > 0 || driveData.folders.length > 0) {
            setFiles(prev => {
              const driveIds = new Set(driveData.files.map(f => f.id));
              const remainingLocal = prev.filter(f => !driveIds.has(f.id) && !f.isGoogleDriveItem);
              return [...driveData.files, ...remainingLocal];
            });
            setFolders(prev => {
              const driveFolderIds = new Set(driveData.folders.map(fd => fd.id));
              const remainingLocalFolders = prev.filter(fd => !driveFolderIds.has(fd.id));
              return [...driveData.folders, ...remainingLocalFolders];
            });
            setSyncStats(s => ({
              ...s,
              status: 'synced',
              totalSyncedCount: driveData.files.length,
              lastSynced: new Date().toISOString(),
            }));
          }
        } catch (err) {
          console.warn('Silent Google Drive initial sync skipped:', err);
        } finally {
          setIsGoogleLoading(false);
        }
      },
      () => {
        setIsGoogleConnected(false);
        setGoogleAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Dynamic zoom calculation based on window size to ensure device frame fits neatly (debounced with rAF)
  useEffect(() => {
    let animFrameId: number | null = null;
    const handleResize = () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(() => {
        const availWidth = window.innerWidth - 64;
        const targetWidth = orientation === 'portrait' ? currentDevice.width : currentDevice.height;
        if (availWidth < targetWidth) {
          setZoomScale(Math.max(0.45, Math.min(0.85, (availWidth / targetWidth) * 0.95)));
        }
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [currentDevice, orientation]);

  // Handlers for File Actions & Google Drive Operations
  const handleUploadFile = (newFile: DriveFile) => {
    setFiles(prev => [newFile, ...prev]);
    setSyncStats(prev => ({
      ...prev,
      status: 'syncing',
      pendingCount: prev.pendingCount + 1,
    }));
    setTimeout(() => {
      setSyncStats(prev => ({
        ...prev,
        status: 'synced',
        pendingCount: 0,
        lastSynced: new Date().toISOString(),
        totalSyncedCount: prev.totalSyncedCount + 1,
      }));
    }, 1200);
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      const result = await googleSignIn();
      if (result) {
        setGoogleAccessToken(result.accessToken);
        setIsGoogleConnected(true);
        setUserProfile({
          name: result.user.displayName || 'Google Drive User',
          email: result.user.email || 'awasthi.sach@gmail.com',
          avatar: result.user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          isConnected: true,
        });

        const driveData = await fetchGoogleDriveData(result.accessToken);
        setFiles(prev => {
          const driveIds = new Set(driveData.files.map(f => f.id));
          const remaining = prev.filter(f => !driveIds.has(f.id) && !f.isGoogleDriveItem);
          return [...driveData.files, ...remaining];
        });
        setFolders(prev => {
          const driveFolderIds = new Set(driveData.folders.map(fd => fd.id));
          const remaining = prev.filter(fd => !driveFolderIds.has(fd.id));
          return [...driveData.folders, ...remaining];
        });

        setSyncStats(s => ({
          ...s,
          status: 'synced',
          totalSyncedCount: driveData.files.length,
          lastSynced: new Date().toISOString(),
        }));

        showDriveToast(
          `Google Drive connected! ${driveData.files.length} files & ${driveData.folders.length} folders loaded.`
        );
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      showDriveToast(`Sign-in failed: ${err.message || 'Unable to connect to Google Drive'}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await googleSignOut();
      setIsGoogleConnected(false);
      setGoogleAccessToken(null);
      setUserProfile(p => ({ ...p, isConnected: false }));
      setFiles(INITIAL_FILES);
      setFolders(INITIAL_FOLDERS);
      showDriveToast('Disconnected from Google Drive (साइन आउट संपन्न)');
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  const handleSyncGoogleDrive = async () => {
    const token = googleAccessToken || (await getAccessToken());
    if (!token) {
      handleGoogleSignIn();
      return;
    }

    try {
      setIsGoogleLoading(true);
      const driveData = await fetchGoogleDriveData(token);
      setFiles(prev => {
        const driveIds = new Set(driveData.files.map(f => f.id));
        const remaining = prev.filter(f => !driveIds.has(f.id) && !f.isGoogleDriveItem);
        return [...driveData.files, ...remaining];
      });
      setFolders(prev => {
        const driveFolderIds = new Set(driveData.folders.map(fd => fd.id));
        const remaining = prev.filter(fd => !driveFolderIds.has(fd.id));
        return [...driveData.folders, ...remaining];
      });
      setSyncStats(s => ({
        ...s,
        status: 'synced',
        totalSyncedCount: driveData.files.length,
        lastSynced: new Date().toISOString(),
      }));
      showDriveToast(`Google Drive synced: ${driveData.files.length} files up to date!`);
    } catch (err: any) {
      console.error('Google Drive Sync failed:', err);
      showDriveToast(`Sync failed: ${err.message || 'Error communicating with Google Drive'}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDeleteFile = async (id: string) => {
    const fileToDelete = files.find(f => f.id === id);
    setFiles(prev => prev.filter(f => f.id !== id));
    const token = googleAccessToken || (await getAccessToken());
    if (token && fileToDelete?.isGoogleDriveItem) {
      try {
        await deleteGoogleDriveFile(token, id);
        showDriveToast(`"${fileToDelete.name}" deleted from Google Drive`);
      } catch (err: any) {
        console.error('Google Drive delete error:', err);
      }
    }
  };

  const handleRemoveMultipleFiles = async (ids: string[]) => {
    const idSet = new Set(ids);
    const filesToDelete = files.filter(f => idSet.has(f.id));
    setFiles(prev => prev.filter(f => !idSet.has(f.id)));
    const token = googleAccessToken || (await getAccessToken());
    if (token) {
      const driveItems = filesToDelete.filter(f => f.isGoogleDriveItem);
      if (driveItems.length > 0) {
        try {
          await Promise.all(driveItems.map(f => deleteGoogleDriveFile(token, f.id)));
          showDriveToast(`${driveItems.length} file(s) removed from Google Drive`);
        } catch (err: any) {
          console.error('Google Drive batch delete error:', err);
        }
      }
    }
  };

  const handleCreateFolder = async (newFolder: FolderItem) => {
    setFolders(prev => [...prev, newFolder]);
    const token = googleAccessToken || (await getAccessToken());
    if (token && isGoogleConnected) {
      try {
        const created = await createGoogleDriveFolder(token, newFolder.name);
        setFolders(prev =>
          prev.map(fd => (fd.id === newFolder.id ? { ...fd, id: created.id } : fd))
        );
        showDriveToast(`Folder "${newFolder.name}" created in Google Drive!`);
      } catch (err: any) {
        console.error('Google Drive folder creation error:', err);
      }
    }
  };

  const handleMoveFilesToFolder = async (fileIds: string[], targetFolderId: string | undefined) => {
    const idSet = new Set(fileIds);
    setFiles(prev =>
      prev.map(f => (idSet.has(f.id) ? { ...f, folderId: targetFolderId } : f))
    );

    const token = googleAccessToken || (await getAccessToken());
    if (token) {
      const driveFilesToMove = files.filter(f => idSet.has(f.id) && f.isGoogleDriveItem);
      if (driveFilesToMove.length > 0) {
        try {
          await Promise.all(
            driveFilesToMove.map(f =>
              moveGoogleDriveFile(token, f.id, targetFolderId || 'root', f.parentIds || [])
            )
          );
          showDriveToast(`${driveFilesToMove.length} Google Drive file(s) moved to folder!`);
        } catch (err: any) {
          console.error('Google Drive move error:', err);
          showDriveToast(`Google Drive move error: ${err.message || 'Check permissions'}`);
        }
      }
    }
  };

  const handleToggleStar = (id: string) => {
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, starred: !f.starred } : f))
    );
  };

  const handleToggleOffline = (id: string) => {
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, isOffline: !f.isOffline } : f))
    );
  };

  const handleAddVaultFile = (vaultFile: VaultFile) => {
    setVaultFiles(prev => [vaultFile, ...prev]);
  };

  const handleDeleteVaultFile = (id: string) => {
    setVaultFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleTriggerSync = () => {
    setSyncStats(prev => ({ ...prev, status: 'syncing' }));
    setTimeout(() => {
      setSyncStats(prev => ({
        ...prev,
        status: 'synced',
        lastSynced: new Date().toISOString(),
        pendingCount: 0,
      }));
    }, 1400);
  };

  const handleToggleOnline = () => {
    setSyncStats(prev => ({
      ...prev,
      networkOnline: !prev.networkOnline,
      status: !prev.networkOnline ? 'synced' : 'offline_only',
    }));
  };

  const handleRotateOrientation = () => {
    setOrientation(prev => (prev === 'portrait' ? 'landscape' : 'portrait'));
  };

  const handleLoadDeviceInEmulator = (device: DeviceProfile, orient: 'portrait' | 'landscape') => {
    setCurrentDevice(device);
    setOrientation(orient);
    setActiveViewMode('emulator');
    if (autoReloadOnConfigChange) {
      handleReloadEmulator();
    }
  };

  // Dimensions
  const targetWidth = orientation === 'portrait' ? currentDevice.width : currentDevice.height;
  const targetHeight = orientation === 'portrait' ? currentDevice.height : currentDevice.width;

  // Render Inner Application Content
  const renderAppContent = () => (
    <div
      className={`min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 ${
        showOverflowInspector ? 'overflow-inspector-active' : ''
      } ${showTouchTargetAudit ? 'touch-target-audit-active' : ''}`}
    >
      {/* Application Main Navigation Bar */}
      <nav className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-5 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Brand & Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="mobile-nav-toggle-btn"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <Cloud className="w-4 h-4" />
              </div>
              <div className="hidden min-[420px]:block">
                <span className="font-bold text-xs sm:text-sm tracking-tight text-zinc-900 dark:text-zinc-100 leading-none block">
                  Perfect VVF
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">Virtual Vault &amp; Files</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60 text-xs">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Folder },
              { id: 'storage_scanner', label: 'Phone & SD Scan', icon: Smartphone },
              { id: 'vault', label: 'Privacy Vault', icon: Shield },
              { id: 'duplicates', label: 'Duplicates', icon: Copy },
              { id: 'search', label: 'AI Search', icon: Sparkles },
              { id: 'offline', label: 'Offline Files', icon: HardDrive },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition min-h-[36px] ${
                    isActive
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Header: Sync Status & User Profile */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <SyncStatusBadge
              stats={syncStats}
              onTriggerSync={handleTriggerSync}
              onToggleOnline={handleToggleOnline}
            />
            <Login
              userEmail={userProfile.email}
              userName={userProfile.name}
              avatarUrl={userProfile.avatar}
              isConnected={isGoogleConnected}
              isLoading={isGoogleLoading}
              onSignIn={handleGoogleSignIn}
              onSignOut={handleGoogleSignOut}
              onSyncDrive={handleSyncGoogleDrive}
            />
          </div>
        </div>

        {/* Mobile Dropdown Menu (Collapsible) */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-3 pb-2 border-t border-zinc-100 dark:border-zinc-800 mt-2 space-y-1 animate-in fade-in">
            {[
              { id: 'dashboard', label: 'Dashboard Explorer', icon: Folder },
              { id: 'storage_scanner', label: 'Phone & SD Scanner (फ़ोन व SD मेमोरी)', icon: Smartphone },
              { id: 'vault', label: 'Privacy Vault (AES-256)', icon: Shield },
              { id: 'duplicates', label: 'Duplicate File Cleaner', icon: Copy },
              { id: 'search', label: 'AI Semantic Search', icon: Sparkles },
              { id: 'offline', label: 'Offline Pinned Storage', icon: HardDrive },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Main Workspace Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3.5 sm:p-5 md:p-6 lg:p-8 space-y-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            files={files}
            folders={folders}
            vaultFiles={vaultFiles}
            onUploadFile={handleUploadFile}
            onDeleteFile={handleDeleteFile}
            onDeleteMultipleFiles={handleRemoveMultipleFiles}
            onMoveFilesToFolder={handleMoveFilesToFolder}
            onCreateFolder={handleCreateFolder}
            onToggleStar={handleToggleStar}
            onToggleOffline={handleToggleOffline}
            onSelectTab={tab => setActiveTab(tab as any)}
            onSelectPreviewFile={file => setPreviewFile(file)}
            isGoogleConnected={isGoogleConnected}
            isGoogleLoading={isGoogleLoading}
            googleUserEmail={userProfile.email}
            onConnectGoogleDrive={handleGoogleSignIn}
            onSyncGoogleDrive={handleSyncGoogleDrive}
          />
        )}

        {activeTab === 'storage_scanner' && (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <DeviceStorageScanner
              onImportToDrive={handleUploadFile}
              onImportToVault={handleAddVaultFile}
              onSelectPreviewFile={file => setPreviewFile(file)}
            />
          </React.Suspense>
        )}

        {activeTab === 'vault' && (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <PrivacyVault
              vaultFiles={vaultFiles}
              onAddVaultFile={handleAddVaultFile}
              onDeleteVaultFile={handleDeleteVaultFile}
            />
          </React.Suspense>
        )}

        {activeTab === 'duplicates' && (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <DuplicateFinder
              files={files}
              onRemoveFiles={handleRemoveMultipleFiles}
            />
          </React.Suspense>
        )}

        {activeTab === 'search' && (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <SemanticSearch
              files={files}
              folders={folders}
              onSelectFile={file => setPreviewFile(file)}
              onMoveFile={file => setSearchMoveTargetFile(file)}
            />
          </React.Suspense>
        )}

        {activeTab === 'offline' && (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <OfflineFilesList
              files={files}
              onToggleOffline={handleToggleOffline}
              onSelectFile={file => setPreviewFile(file)}
            />
          </React.Suspense>
        )}
      </main>

      {/* Responsive Footer */}
      <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 px-4 py-3 text-xs text-zinc-500 text-center flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span>Perfect VVF v2.4 • Client-Side Zero-Knowledge Encryption</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          <span>Google Drive API v3</span>
          <span>•</span>
          <span>IndexedDB Persistence</span>
          <span>•</span>
          <button
            type="button"
            onClick={() => setActiveViewMode('audit_report')}
            className="text-blue-500 hover:underline font-medium min-h-[36px] flex items-center"
          >
            View Responsive Audit Report
          </button>
        </div>
      </footer>

      {/* File Preview Modal */}
      {previewFile && (
        <React.Suspense fallback={null}>
          <FilePreviewModal
            file={previewFile}
            onClose={() => setPreviewFile(null)}
            onToggleOffline={handleToggleOffline}
          />
        </React.Suspense>
      )}

      {/* Semantic Search Direct Move Modal */}
      {searchMoveTargetFile && (
        <MoveToFolderModal
          isOpen={Boolean(searchMoveTargetFile)}
          onClose={() => setSearchMoveTargetFile(null)}
          selectedFiles={[searchMoveTargetFile]}
          folders={folders}
          allFiles={files}
          onConfirmMove={targetFolderId => {
            handleMoveFilesToFolder([searchMoveTargetFile.id], targetFolderId);
            setSearchMoveTargetFile(null);
          }}
          onCreateFolder={handleCreateFolder}
        />
      )}

      {/* Global Drive Toast Notification */}
      {driveNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 shadow-2xl border border-zinc-700 dark:border-zinc-300 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{driveNotification}</span>
          <button
            type="button"
            onClick={() => setDriveNotification(null)}
            className="ml-2 text-zinc-400 hover:text-white dark:hover:text-black cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Emulator & Inspection Top Control Header */}
      <EmulatorToolbar
        currentDevice={currentDevice}
        orientation={orientation}
        zoomScale={zoomScale}
        dpr={dpr}
        showOverflowInspector={showOverflowInspector}
        showTouchTargetAudit={showTouchTargetAudit}
        activeViewMode={activeViewMode}
        isReloading={isReloadingEmulator}
        autoReload={autoReloadOnConfigChange}
        onSelectDevice={dev => setCurrentDevice(dev)}
        onToggleOrientation={handleRotateOrientation}
        onSetZoom={z => setZoomScale(z)}
        onSetDpr={d => setDpr(d)}
        onToggleOverflowInspector={() => setShowOverflowInspector(!showOverflowInspector)}
        onToggleTouchTargetAudit={() => setShowTouchTargetAudit(!showTouchTargetAudit)}
        onSelectViewMode={mode => setActiveViewMode(mode)}
        onToggleAutoReload={() => setAutoReloadOnConfigChange(prev => !prev)}
        onManualReload={handleReloadEmulator}
      />

      {/* View Content based on activeViewMode */}
      {activeViewMode === 'audit_report' ? (
        <div className="flex-1 bg-zinc-950 p-4 sm:p-6 overflow-y-auto">
          <React.Suspense fallback={<TabLoadingFallback />}>
            <ResponsiveAuditReport onLoadDeviceInEmulator={handleLoadDeviceInEmulator} />
          </React.Suspense>
        </div>
      ) : activeViewMode === 'native' ? (
        /* Native Full-Screen Fluid Breakpoint Testing */
        <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
          {renderAppContent()}
        </div>
      ) : (
        /* Device Emulator Workspace with Realistic Frame */
        <div className="flex-1 bg-zinc-900/90 flex flex-col items-center justify-start p-4 sm:p-8 overflow-auto">
          {/* Device Dimension & Orientation Header Bar */}
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2.5 px-4 py-2 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-xs font-mono shadow-md backdrop-blur-xs">
            <span className="font-bold text-zinc-200">{currentDevice.name}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-blue-400 capitalize">{orientation}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-amber-400">{targetWidth} × {targetHeight} CSS px</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400 font-semibold">{dpr}x DPR</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">{currentDevice.aspectRatio}</span>
            <span className="text-zinc-600">•</span>
            <div className="flex items-center gap-1.5 text-zinc-300 text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  autoReloadOnConfigChange ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                }`}
              />
              <span>Auto-Reload: {autoReloadOnConfigChange ? 'Active' : 'Paused'}</span>
              {lastReloadTimestamp && (
                <span className="text-zinc-500 text-[10px]">({lastReloadTimestamp})</span>
              )}
            </div>
          </div>

          {/* Scaled Device Frame Container */}
          <div
            className="transition-all duration-300 flex items-center justify-center origin-top pb-12"
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top center',
            }}
          >
            <div
              id="device-frame-shell"
              className="relative bg-zinc-950 border-[10px] sm:border-[12px] border-zinc-800/90 shadow-2xl overflow-hidden ring-1 ring-zinc-700/50"
              style={{
                width: `${targetWidth}px`,
                height: `${targetHeight}px`,
                borderRadius: `${currentDevice.bezelRadius}px`,
              }}
            >
              {/* Device Dynamic Island / Camera Punch Hole simulation */}
              {currentDevice.category === 'mobile' && orientation === 'portrait' && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-50 pointer-events-none flex items-center justify-end px-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-800 ring-1 ring-zinc-700/50" />
                </div>
              )}

              {/* Reloading Overlay with Style Recalculation Indicator */}
              {isReloadingEmulator && (
                <div
                  id="emulator-reloading-overlay"
                  className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150 pointer-events-none"
                >
                  <div className="p-3 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 mb-3 shadow-xl">
                    <RotateCw className="w-6 h-6 animate-spin" />
                  </div>
                  <p className="text-sm font-bold text-zinc-100 tracking-tight">Auto-Reloading Viewport</p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                    Recalculating styles & layout for {currentDevice.name} ({orientation})
                  </p>
                  <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{targetWidth} × {targetHeight} CSS px</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-emerald-400 font-semibold">Styles Recalculated</span>
                  </div>
                </div>
              )}

              {/* Internal Device Screen: Scrollable & Remounted on reload key */}
              <div
                id="device-screen-scroll-container"
                key={`emulator-screen-${currentDevice.id}-${orientation}-${emulatorReloadKey}`}
                className="w-full h-full overflow-y-auto overflow-x-hidden bg-zinc-50 dark:bg-zinc-950 scroll-smooth"
              >
                {renderAppContent()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global PWA Offline Connectivity Banner */}
      <OfflineIndicator />
    </div>
  );
}
