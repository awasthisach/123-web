import React, { useState, useEffect } from 'react';
import {
  Cloud, CheckCircle2, X,
} from 'lucide-react';
import { DriveFile, VaultFile, SyncStats, FolderItem } from './types';
import { INITIAL_FILES, INITIAL_FOLDERS } from './lib/driveApi';
import { Dashboard } from './components/Dashboard';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MoveToFolderModal } from './components/MoveToFolderModal';
import { AuthErrorModal } from './components/AuthErrorModal';
import { initAuth, googleSignIn, googleSignOut, getAccessToken } from './lib/firebaseAuth';
import {
  fetchGoogleDriveData,
  moveGoogleDriveFile,
  createGoogleDriveFolder,
  deleteGoogleDriveFile,
  DriveFileTypeFilter,
} from './lib/googleDriveService';

const DeviceStorageScanner = React.lazy(() =>
  import('./components/DeviceStorageScanner').then(m => ({ default: m.DeviceStorageScanner }))
);
const PrivacyVault = React.lazy(() =>
  import('./components/PrivacyVault').then(m => ({ default: m.PrivacyVault }))
);
const DuplicateFinder = React.lazy(() =>
  import('./components/DuplicateFinder').then(m => ({ default: m.DuplicateFinder }))
);
const SemanticSearch = React.lazy(() =>
  import('./components/SemanticSearch').then(m => ({ default: m.SemanticSearch }))
);
const OfflineFilesList = React.lazy(() =>
  import('./components/OfflineFilesList').then(m => ({ default: m.OfflineFilesList }))
);
const FilePreviewModal = React.lazy(() =>
  import('./components/FilePreviewModal').then(m => ({ default: m.FilePreviewModal }))
);

const TabLoadingFallback = () => (
  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 space-y-4 animate-pulse">
    <div className="h-6 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
    <div className="h-20 w-full bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
  </div>
);

export default function App() {
  const [files, setFiles] = useState<DriveFile[]>(INITIAL_FILES);
  const [folders, setFolders] = useState<FolderItem[]>(INITIAL_FOLDERS);
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [driveFileTypeFilter, setDriveFileTypeFilter] = useState<DriveFileTypeFilter>('all');
  const [driveNotification, setDriveNotification] = useState<string | null>(null);
  const [authErrorModalOpen, setAuthErrorModalOpen] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'storage_scanner' | 'vault' | 'duplicates' | 'search' | 'offline'>('dashboard');
  const [syncStats, setSyncStats] = useState<SyncStats>({
    status: 'synced', lastSynced: new Date().toISOString(), pendingCount: 0,
    totalSyncedCount: INITIAL_FILES.length, bandwidthUsage: '142 KB/s', networkOnline: true,
  });
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [searchMoveTargetFile, setSearchMoveTargetFile] = useState<DriveFile | null>(null);
  const [userProfile, setUserProfile] = useState({
    name: 'User', email: '', avatar: '', isConnected: false,
  });

  const showDriveToast = (msg: string) => {
    setDriveNotification(msg);
    setTimeout(() => setDriveNotification(null), 5000);
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setIsGoogleConnected(true);
        setGoogleAccessToken(token);
        setUserProfile({
          name: user.displayName || 'Google Drive User',
          email: user.email || '',
          avatar: user.photoURL || '',
          isConnected: true,
        });
        try {
          setIsGoogleLoading(true);
          const driveData = await fetchGoogleDriveData(token, 'all');
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
            setSyncStats(s => ({ ...s, status: 'synced', totalSyncedCount: driveData.files.length, lastSynced: new Date().toISOString() }));
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

  const handleUploadFile = (newFile: DriveFile) => setFiles(prev => [newFile, ...prev]);

  const handleConnectDemoDrive = () => {
    setIsGoogleConnected(true);
    setUserProfile(p => ({ ...p, name: 'Demo Drive', isConnected: true }));
    setFiles(INITIAL_FILES);
    setFolders(INITIAL_FOLDERS);
    showDriveToast('Demo Google Drive Connected');
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
          email: result.user.email || '',
          avatar: result.user.photoURL || '',
          isConnected: true,
        });
        try {
          const driveData = await fetchGoogleDriveData(result.accessToken, driveFileTypeFilter);
          if (driveData.files.length > 0 || driveData.folders.length > 0) {
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
            setSyncStats(s => ({ ...s, status: 'synced', totalSyncedCount: driveData.files.length, lastSynced: new Date().toISOString() }));
            showDriveToast(`Google Drive connected! ${driveData.files.length} files loaded.`);
          } else {
            showDriveToast('Google Drive connected! (No files found)');
          }
        } catch (e: any) {
          showDriveToast(`Connected but sync issue: ${e?.message || 'retry Sync Now'}`);
        }
      } else {
        showDriveToast('Google Sign-In cancelled.');
      }
    } catch (err: any) {
      const message = err?.message || 'Unable to connect to Google Drive';
      if (message.includes('popup-closed') || message.includes('cancelled')) {
        showDriveToast('Sign-In cancelled.');
      } else {
        setAuthErrorMessage(message);
        setAuthErrorModalOpen(true);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await googleSignOut();
      setIsGoogleConnected(false);
      setGoogleAccessToken(null);
      setUserProfile(p => ({ ...p, isConnected: false, email: '' }));
      setFiles(INITIAL_FILES);
      setFolders(INITIAL_FOLDERS);
      showDriveToast('Disconnected from Google Drive');
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const handleSyncGoogleDrive = async (fileType?: DriveFileTypeFilter) => {
    const token = googleAccessToken || (await getAccessToken());
    if (!token) {
      handleGoogleSignIn();
      return;
    }
    const typeToUse = fileType || driveFileTypeFilter;
    try {
      setIsGoogleLoading(true);
      if (fileType) setDriveFileTypeFilter(fileType);
      const driveData = await fetchGoogleDriveData(token, typeToUse);
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
      setSyncStats(s => ({ ...s, status: 'synced', totalSyncedCount: driveData.files.length, lastSynced: new Date().toISOString() }));
      showDriveToast(`Synced (${typeToUse}): ${driveData.files.length} files loaded!`);
    } catch (err: any) {
      const msg = err?.message || 'Error';
      console.error('Sync failed:', msg);
      if (String(msg).includes('401') || /invalid|auth|login/i.test(String(msg))) {
        showDriveToast('Session expired — Sign in again');
        setGoogleAccessToken(null);
        setIsGoogleConnected(false);
      } else {
        showDriveToast(`Sync failed: ${msg}`);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDeleteFile = async (id: string) => {
    const fileToDelete = files.find(f => f.id === id);
    if (!fileToDelete) return;
    const token = googleAccessToken || (await getAccessToken());
    if (fileToDelete.isGoogleDriveItem) {
      if (!token) {
        showDriveToast('Sign in required to delete Drive files');
        return;
      }
      try {
        await deleteGoogleDriveFile(token, id);
        setFiles(prev => prev.filter(f => f.id !== id));
        showDriveToast(`Deleted "${fileToDelete.name}"`);
      } catch (err: any) {
        console.error(err);
        showDriveToast(`Delete failed: ${err?.message || 'error'} — file kept`);
      }
    } else {
      setFiles(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleRemoveMultipleFiles = async (ids: string[]) => {
    const idSet = new Set(ids);
    const filesToDelete = files.filter(f => idSet.has(f.id));
    const localOnly = filesToDelete.filter(f => !f.isGoogleDriveItem);
    const driveItems = filesToDelete.filter(f => f.isGoogleDriveItem);
    if (localOnly.length) {
      const localIds = new Set(localOnly.map(f => f.id));
      setFiles(prev => prev.filter(f => !localIds.has(f.id)));
    }
    if (driveItems.length === 0) return;
    const token = googleAccessToken || (await getAccessToken());
    if (!token) {
      showDriveToast('Sign in required to delete Drive files');
      return;
    }
    const succeeded: string[] = [];
    const failed: string[] = [];
    for (const f of driveItems) {
      try {
        await deleteGoogleDriveFile(token, f.id);
        succeeded.push(f.id);
      } catch (err) {
        console.error(err);
        failed.push(f.name);
      }
    }
    if (succeeded.length) {
      const ok = new Set(succeeded);
      setFiles(prev => prev.filter(f => !ok.has(f.id)));
    }
    if (failed.length) {
      showDriveToast(`Delete partial: ${failed.length} failed (${failed.slice(0, 2).join(', ')})`);
    } else if (succeeded.length) {
      showDriveToast(`Deleted ${succeeded.length} Drive file(s)`);
    }
  };

  const handleCreateFolder = async (newFolder: FolderItem) => {
    setFolders(prev => [...prev, newFolder]);
    const token = googleAccessToken || (await getAccessToken());
    if (token && isGoogleConnected) {
      try {
        const created = await createGoogleDriveFolder(token, newFolder.name);
        setFolders(prev => prev.map(fd => (fd.id === newFolder.id ? { ...fd, id: created.id } : fd)));
      } catch (err) {
        console.error(err);
        showDriveToast('Folder create failed on Drive');
      }
    }
  };

  const handleMoveFilesToFolder = async (fileIds: string[], targetFolderId: string | undefined) => {
    const idSet = new Set(fileIds);
    const snapshot = files.filter(f => idSet.has(f.id));
    const localIds = new Set(snapshot.filter(f => !f.isGoogleDriveItem).map(f => f.id));
    if (localIds.size) {
      setFiles(prev => prev.map(f => (localIds.has(f.id) ? { ...f, folderId: targetFolderId } : f)));
    }
    const driveItems = snapshot.filter(f => f.isGoogleDriveItem);
    if (!driveItems.length) return;
    const token = googleAccessToken || (await getAccessToken());
    if (!token) {
      showDriveToast('Sign in required to move Drive files');
      return;
    }
    const succeeded: string[] = [];
    for (const f of driveItems) {
      try {
        await moveGoogleDriveFile(token, f.id, targetFolderId || 'root');
        succeeded.push(f.id);
      } catch (err: any) {
        console.error(err);
        showDriveToast(`Move failed for ${f.name}: ${err?.message || 'error'}`);
      }
    }
    if (succeeded.length) {
      const ok = new Set(succeeded);
      setFiles(prev => prev.map(f => (ok.has(f.id) ? { ...f, folderId: targetFolderId } : f)));
    }
  };

  const handleToggleStar = (id: string) => {
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, starred: !f.starred } : f)));
  };
  const handleToggleOffline = (id: string) => {
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, isOffline: !f.isOffline } : f)));
  };
  const handleAddVaultFile = (file: VaultFile) => setVaultFiles(prev => [file, ...prev]);
  const handleDeleteVaultFile = (id: string) => setVaultFiles(prev => prev.filter(f => f.id !== id));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-sm">Drive Semantic Search</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">{syncStats.status}</span>
          {isGoogleConnected ? (
            <button type="button" onClick={handleGoogleSignOut} className="text-xs px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700">Sign out</button>
          ) : null}
        </div>
      </header>

      <nav className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
        {(['dashboard', 'search', 'duplicates', 'vault', 'storage_scanner', 'offline'] as const).map(id => (
          <button key={id} type="button" onClick={() => setActiveTab(id)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === id ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
            {id === 'storage_scanner' ? 'Storage' : id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </nav>

      <main className="p-4 max-w-5xl mx-auto">
        {activeTab === 'dashboard' && (
          <Dashboard
            files={files} folders={folders} vaultFiles={vaultFiles}
            onUploadFile={handleUploadFile} onDeleteFile={handleDeleteFile}
            onDeleteMultipleFiles={handleRemoveMultipleFiles} onMoveFilesToFolder={handleMoveFilesToFolder}
            onCreateFolder={handleCreateFolder} onToggleStar={handleToggleStar} onToggleOffline={handleToggleOffline}
            onSelectTab={tab => setActiveTab(tab as any)} onSelectPreviewFile={setPreviewFile}
            isGoogleConnected={isGoogleConnected} isGoogleLoading={isGoogleLoading}
            googleUserEmail={userProfile.email}
            onConnectGoogleDrive={handleGoogleSignIn} onConnectDemoDrive={handleConnectDemoDrive}
            onSyncGoogleDrive={handleSyncGoogleDrive}
            driveFileTypeFilter={driveFileTypeFilter}
            onDriveFileTypeChange={t => { setDriveFileTypeFilter(t); handleSyncGoogleDrive(t); }}
          />
        )}
        {activeTab === 'search' && (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <SemanticSearch files={files} folders={folders} onSelectFile={setPreviewFile} onMoveFile={f => setSearchMoveTargetFile(f)} />
          </React.Suspense>
        )}
        {activeTab === 'duplicates' && (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <DuplicateFinder files={files} onRemoveFiles={handleRemoveMultipleFiles} />
          </React.Suspense>
        )}
        {activeTab === 'vault' && (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <PrivacyVault vaultFiles={vaultFiles} onAddVaultFile={handleAddVaultFile} onDeleteVaultFile={handleDeleteVaultFile} />
          </React.Suspense>
        )}
        {activeTab === 'storage_scanner' && (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <DeviceStorageScanner onImportToDrive={handleUploadFile} onImportToVault={handleAddVaultFile} onSelectPreviewFile={setPreviewFile} />
          </React.Suspense>
        )}
        {activeTab === 'offline' && (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <OfflineFilesList files={files} onToggleOffline={handleToggleOffline} onSelectFile={setPreviewFile} />
          </React.Suspense>
        )}
      </main>

      <OfflineIndicator />
      <AuthErrorModal isOpen={authErrorModalOpen} onClose={() => setAuthErrorModalOpen(false)}
        errorMessage={authErrorMessage} onConnectDemoDrive={handleConnectDemoDrive}
        onRetrySignIn={handleGoogleSignIn} isLoading={isGoogleLoading} />

      {driveNotification && (
        <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900 text-zinc-100 shadow-2xl text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{driveNotification}</span>
          <button type="button" onClick={() => setDriveNotification(null)} className="ml-2 text-zinc-400"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {previewFile && (
        <React.Suspense fallback={null}>
          <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
        </React.Suspense>
      )}
      {searchMoveTargetFile && (
        <MoveToFolderModal
          isOpen={!!searchMoveTargetFile}
          onClose={() => setSearchMoveTargetFile(null)}
          selectedFiles={[searchMoveTargetFile]}
          folders={folders}
          allFiles={files}
          onConfirmMove={folderId => {
            handleMoveFilesToFolder([searchMoveTargetFile.id], folderId);
            setSearchMoveTargetFile(null);
          }}
          onCreateFolder={handleCreateFolder}
        />
      )}
    </div>
  );
}
