export type FileCategory = 'document' | 'image' | 'spreadsheet' | 'code' | 'archive' | 'audio' | 'video' | 'other';
export type DriveSyncStatus = 'synced' | 'syncing' | 'pending' | 'offline_only' | 'error';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number; // bytes
  modifiedTime: string;
  createdTime: string;
  category: FileCategory;
  thumbnailUrl?: string;
  isOffline: boolean;
  isEncrypted: boolean;
  contentHash: string;
  tags: string[];
  semanticSummary: string;
  starred?: boolean;
}

export interface VaultFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  encryptedData: string; // Base64 ciphertext
  iv: string; // Base64 IV
  salt: string; // Base64 salt
  uploadedAt: string;
  tags: string[];
  notes?: string;
}

export interface DuplicateGroup {
  hash: string;
  fileCount: number;
  totalSize: number;
  reclaimableSize: number;
  files: DriveFile[];
}

export interface SemanticSearchResult {
  file: DriveFile;
  score: number; // 0 - 100
  matchedSnippet: string;
  relevanceReason: string;
}

export interface SyncStats {
  status: DriveSyncStatus;
  lastSynced: string;
  pendingCount: number;
  totalSyncedCount: number;
  bandwidthUsage: string;
  networkOnline: boolean;
}

export type DeviceCategory = 'mobile' | 'tablet' | 'desktop';
export type DeviceOrientation = 'portrait' | 'landscape';

export interface DeviceProfile {
  id: string;
  name: string;
  category: DeviceCategory;
  width: number;
  height: number;
  dpr: number;
  aspectRatio: string;
  os: 'ios' | 'android' | 'macos' | 'windows';
  bezelRadius: number;
}

export interface LayoutGlitchItem {
  id: string;
  title: string;
  viewport: string;
  aspectRatio: string;
  category: 'overflow' | 'alignment' | 'touch_target' | 'image_scaling' | 'orientation';
  severity: 'high' | 'medium' | 'low';
  glitchDescription: string;
  rootCause: string;
  fixApplied: string;
  status: 'fixed' | 'verified';
}
