/**
 * IndexedDB cache for offline-pinned file bytes.
 */

const DB_NAME = 'drive-semantic-offline';
const DB_VERSION = 1;
const STORE = 'blobs';

export interface OfflineBlobMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  cachedAt: string;
  sha256?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error || new Error('IDB open failed'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function putOfflineBlob(
  id: string,
  blob: Blob,
  meta: { name: string; mimeType: string; size: number; sha256?: string }
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({
      id,
      blob,
      name: meta.name,
      mimeType: meta.mimeType,
      size: meta.size,
      sha256: meta.sha256,
      cachedAt: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result?.blob || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function removeOfflineBlob(id: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export async function listOfflineMeta(): Promise<OfflineBlobMeta[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        resolve(
          (req.result || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            mimeType: r.mimeType,
            size: r.size,
            cachedAt: r.cachedAt,
            sha256: r.sha256,
          }))
        );
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function sha256Blob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const NATIVE_EXPORT: Record<string, { exportMime: string; ext: string }> = {
  'application/vnd.google-apps.document': {
    exportMime: 'application/pdf',
    ext: '.pdf',
  },
  'application/vnd.google-apps.spreadsheet': {
    exportMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: '.xlsx',
  },
  'application/vnd.google-apps.presentation': {
    exportMime: 'application/pdf',
    ext: '.pdf',
  },
  'application/vnd.google-apps.drawing': {
    exportMime: 'image/png',
    ext: '.png',
  },
};

export function getNativeExportHint(mimeType: string): { exportMime: string; ext: string } | null {
  return NATIVE_EXPORT[mimeType] || null;
}

/** Binary via alt=media; Google Docs/Sheets/Slides via export. */
export async function downloadDriveFileBytes(
  accessToken: string,
  fileId: string,
  mimeType: string
): Promise<{ blob: Blob; downloadName?: string }> {
  const native = NATIVE_EXPORT[mimeType];
  if (native) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(native.exportMime)}`,
      { headers: { Authorization: 'Bearer ' + accessToken } }
    );
    if (!res.ok) {
      throw new Error('Export failed: ' + res.status);
    }
    return { blob: await res.blob(), downloadName: native.ext };
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: 'Bearer ' + accessToken } }
  );
  if (!res.ok) {
    throw new Error('Download failed: ' + res.status);
  }
  return { blob: await res.blob() };
}
