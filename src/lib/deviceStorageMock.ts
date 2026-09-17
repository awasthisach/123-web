import { DeviceStorageFile, StorageDeviceStats } from '../types';

export const INITIAL_PHONE_STATS: StorageDeviceStats = {
  source: 'phone_internal',
  label: 'Phone Internal Memory (फ़ोन मेमोरी)',
  totalBytes: 128 * 1024 * 1024 * 1024, // 128 GB
  usedBytes: 86.4 * 1024 * 1024 * 1024, // 86.4 GB
  freeBytes: 41.6 * 1024 * 1024 * 1024, // 41.6 GB
  fileCount: 1420,
  health: 'healthy',
};

export const INITIAL_SD_STATS: StorageDeviceStats = {
  source: 'sd_card',
  label: 'External MicroSD Card (SD कार्ड)',
  totalBytes: 256 * 1024 * 1024 * 1024, // 256 GB
  usedBytes: 198.2 * 1024 * 1024 * 1024, // 198.2 GB
  freeBytes: 57.8 * 1024 * 1024 * 1024, // 57.8 GB
  fileCount: 3840,
  health: 'healthy',
};

export const MOCK_DEVICE_FILES: DeviceStorageFile[] = [
  // Phone Internal Memory Files
  {
    id: 'phone-file-1',
    name: 'ScreenRecording_2026-09-15_1420.mp4',
    path: 'Phone/Movies/ScreenRecordings/ScreenRecording_2026-09-15_1420.mp4',
    source: 'phone_internal',
    size: 245000000, // 245 MB
    mimeType: 'video/mp4',
    category: 'video',
    lastModified: '2026-09-15T14:20:00Z',
    isLargeFile: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=480&auto=format&fit=crop&q=75',
  },
  {
    id: 'phone-file-2',
    name: 'WhatsApp_Viral_Trip_Video.mp4',
    path: 'Phone/WhatsApp/Media/WhatsApp Video/WhatsApp_Viral_Trip_Video.mp4',
    source: 'phone_internal',
    size: 92000000, // 92 MB
    mimeType: 'video/mp4',
    category: 'video',
    lastModified: '2026-09-14T11:00:00Z',
    isLargeFile: true,
    isDuplicate: true,
    duplicateGroupHash: 'hash-viral-video-101',
    thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=480&auto=format&fit=crop&q=75',
  },
  {
    id: 'phone-file-3',
    name: 'WhatsApp_Viral_Trip_Video (Copy).mp4',
    path: 'Phone/Downloads/WhatsApp_Viral_Trip_Video (Copy).mp4',
    source: 'phone_internal',
    size: 92000000, // 92 MB duplicate!
    mimeType: 'video/mp4',
    category: 'video',
    lastModified: '2026-09-14T11:05:00Z',
    isLargeFile: true,
    isDuplicate: true,
    duplicateGroupHash: 'hash-viral-video-101',
    thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=480&auto=format&fit=crop&q=75',
  },
  {
    id: 'phone-file-4',
    name: 'Vendor_System_Installer_v4.2.apk',
    path: 'Phone/Downloads/Vendor_System_Installer_v4.2.apk',
    source: 'phone_internal',
    size: 78500000, // ~78.5 MB
    mimeType: 'application/vnd.android.package-archive',
    category: 'code',
    lastModified: '2026-09-10T09:30:00Z',
    isLargeFile: true,
    isCacheOrJunk: true, // leftover APK installer
  },
  {
    id: 'phone-file-5',
    name: 'IMG_20260916_GoldenHour_Portrait.jpg',
    path: 'Phone/DCIM/Camera/IMG_20260916_GoldenHour_Portrait.jpg',
    source: 'phone_internal',
    size: 8400000, // 8.4 MB
    mimeType: 'image/jpeg',
    category: 'image',
    lastModified: '2026-09-16T18:30:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=480&auto=format&fit=crop&q=75',
  },
  {
    id: 'phone-file-6',
    name: 'browser_cache_dump_0916.tmp',
    path: 'Phone/Android/data/com.browser/cache/browser_cache_dump_0916.tmp',
    source: 'phone_internal',
    size: 42000000, // 42 MB junk
    mimeType: 'application/octet-stream',
    category: 'other',
    lastModified: '2026-09-16T04:10:00Z',
    isCacheOrJunk: true,
    isLargeFile: true,
  },
  {
    id: 'phone-file-7',
    name: 'Salary_Slips_Consolidated_2026.pdf',
    path: 'Phone/Documents/Salary_Slips_Consolidated_2026.pdf',
    source: 'phone_internal',
    size: 5120000, // 5.1 MB
    mimeType: 'application/pdf',
    category: 'document',
    lastModified: '2026-09-12T16:45:00Z',
  },

  // External SD Card Files
  {
    id: 'sd-file-1',
    name: 'Drone_4K_Mountain_Footage.mp4',
    path: 'SD_Card/DCIM/DJI_0042/Drone_4K_Mountain_Footage.mp4',
    source: 'sd_card',
    size: 1450000000, // ~1.45 GB
    mimeType: 'video/mp4',
    category: 'video',
    lastModified: '2026-09-08T15:20:00Z',
    isLargeFile: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=480&auto=format&fit=crop&q=75',
  },
  {
    id: 'sd-file-2',
    name: 'WhatsApp_Viral_Trip_Video.mp4',
    path: 'SD_Card/Backups/MediaArchive/WhatsApp_Viral_Trip_Video.mp4',
    source: 'sd_card',
    size: 92000000, // Duplicate on SD card too!
    mimeType: 'video/mp4',
    category: 'video',
    lastModified: '2026-09-14T11:00:00Z',
    isLargeFile: true,
    isDuplicate: true,
    duplicateGroupHash: 'hash-viral-video-101',
    thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=480&auto=format&fit=crop&q=75',
  },
  {
    id: 'sd-file-3',
    name: 'Lossless_Audio_Master_FLAC.zip',
    path: 'SD_Card/Music/Lossless_Audio_Master_FLAC.zip',
    source: 'sd_card',
    size: 680000000, // 680 MB
    mimeType: 'application/zip',
    category: 'archive',
    lastModified: '2026-08-20T10:00:00Z',
    isLargeFile: true,
  },
  {
    id: 'sd-file-4',
    name: 'Nikon_Raw_Shoot_Batch_DSC_9100.NEF',
    path: 'SD_Card/Photos/RAW/Nikon_Raw_Shoot_Batch_DSC_9100.NEF',
    source: 'sd_card',
    size: 48000000, // 48 MB
    mimeType: 'image/x-nikon-nef',
    category: 'image',
    lastModified: '2026-09-05T12:00:00Z',
    isLargeFile: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=480&auto=format&fit=crop&q=75',
  },
  {
    id: 'sd-file-5',
    name: 'Nikon_Raw_Shoot_Batch_DSC_9100 (1).NEF',
    path: 'SD_Card/Downloads/Nikon_Raw_Shoot_Batch_DSC_9100 (1).NEF',
    source: 'sd_card',
    size: 48000000, // Duplicate NEF
    mimeType: 'image/x-nikon-nef',
    category: 'image',
    lastModified: '2026-09-05T12:00:00Z',
    isLargeFile: true,
    isDuplicate: true,
    duplicateGroupHash: 'hash-nef-raw-9100',
    thumbnailUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=480&auto=format&fit=crop&q=75',
  },
  {
    id: 'sd-file-6',
    name: 'Old_Log_Dump_202607.log',
    path: 'SD_Card/System/Logs/Old_Log_Dump_202607.log',
    source: 'sd_card',
    size: 28000000, // 28 MB log junk
    mimeType: 'text/plain',
    category: 'other',
    lastModified: '2026-07-30T08:00:00Z',
    isCacheOrJunk: true,
    isLargeFile: true,
  },
];
