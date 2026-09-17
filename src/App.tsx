import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { DriveFile, VaultFile, SyncStats, DeviceProfile, DeviceOrientation } from './types';
import { INITIAL_FILES } from './lib/driveApi';
import { EMULATOR_DEVICES } from './lib/devices';
import { Dashboard } from './components/Dashboard';
import { SyncStatusBadge } from './components/SyncStatusBadge';
import { Login } from './components/Login';
import { EmulatorToolbar } from './components/EmulatorToolbar';

// Lazy-loaded code-split components for optimal FCP and TTI
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

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vault' | 'duplicates' | 'search' | 'offline'>('dashboard');
  const [activeViewMode, setActiveViewMode] = useState<'emulator' | 'native' | 'audit_report'>('emulator');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Device Emulator State
  const [currentDevice, setCurrentDevice] = useState<DeviceProfile>(EMULATOR_DEVICES[0]); // iPhone 15 Pro
  const [orientation, setOrientation] = useState<DeviceOrientation>('portrait');
  const [zoomScale, setZoomScale] = useState<number>(0.85);
  const [dpr, setDpr] = useState<number>(3);
  const [showOverflowInspector, setShowOverflowInspector] = useState(false);
  const [showTouchTargetAudit, setShowTouchTargetAudit] = useState(false);

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
    isConnected: true,
  });

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

  // Handlers for File Actions
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

  const handleDeleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleRemoveMultipleFiles = (ids: string[]) => {
    const idSet = new Set(ids);
    setFiles(prev => prev.filter(f => !idSet.has(f.id)));
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
            <SyncStatusBadge
              stats={syncStats}
              onTriggerSync={handleTriggerSync}
              onToggleOnline={handleToggleOnline}
            />
            <Login
              userEmail={userProfile.email}
              userName={userProfile.name}
              avatarUrl={userProfile.avatar}
              isConnected={userProfile.isConnected}
              onToggleConnection={() =>
                setUserProfile(p => ({ ...p, isConnected: !p.isConnected }))
              }
            />
          </div>
        </div>

        {/* Mobile Dropdown Menu (Collapsible) */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-3 pb-2 border-t border-zinc-100 dark:border-zinc-800 mt-2 space-y-1 animate-in fade-in">
            {[
              { id: 'dashboard', label: 'Dashboard Explorer', icon: Folder },
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
            vaultFiles={vaultFiles}
            onUploadFile={handleUploadFile}
            onDeleteFile={handleDeleteFile}
            onToggleStar={handleToggleStar}
            onToggleOffline={handleToggleOffline}
            onSelectTab={tab => setActiveTab(tab as any)}
            onSelectPreviewFile={file => setPreviewFile(file)}
          />
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
              onSelectFile={file => setPreviewFile(file)}
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
        onSelectDevice={dev => setCurrentDevice(dev)}
        onToggleOrientation={handleRotateOrientation}
        onSetZoom={z => setZoomScale(z)}
        onSetDpr={d => setDpr(d)}
        onToggleOverflowInspector={() => setShowOverflowInspector(!showOverflowInspector)}
        onToggleTouchTargetAudit={() => setShowTouchTargetAudit(!showTouchTargetAudit)}
        onSelectViewMode={mode => setActiveViewMode(mode)}
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
          <div className="mb-4 flex items-center gap-3 px-4 py-2 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-xs font-mono shadow-md backdrop-blur-xs">
            <span className="font-bold text-zinc-200">{currentDevice.name}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-blue-400 capitalize">{orientation}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-amber-400">{targetWidth} × {targetHeight} CSS px</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400 font-semibold">{dpr}x DPR</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">{currentDevice.aspectRatio}</span>
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

              {/* Internal Device Screen: Scrollable */}
              <div
                id="device-screen-scroll-container"
                className="w-full h-full overflow-y-auto overflow-x-hidden bg-zinc-50 dark:bg-zinc-950 scroll-smooth"
              >
                {renderAppContent()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
