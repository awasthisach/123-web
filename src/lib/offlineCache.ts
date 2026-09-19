/**
 * IndexedDB cache for offline-pinned file bytes.
 * Only stores blobs for files that were successfully downloaded.
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
      req.onsuccess = () => {
        const row = req.result;
        resolve(row?.blob || null);
      };
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
        const rows = (req.result || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          mimeType: r.mimeType,
          size: r.size,
          cachedAt: r.cachedAt,
          sha256: r.sha256,
        }));
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/** SHA-256 of a Blob using Web Crypto */
export async function sha256Blob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Download non-Google-native Drive file bytes.
 * Google Docs/Sheets need export — not supported here.
 */
export async function downloadDriveFileBytes(
  accessToken: string,
  fileId: string,
  mimeType: string
): Promise<Blob> {
  if (mimeType.startsWith('application/vnd.google-apps.')) {
    throw new Error('Google native files need export; pin binary files (PDF, images, zip) instead');
  }
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: 'Bearer ' + accessToken } }
  );
  if (!res.ok) {
    throw new Error('Download failed: ' + res.status);
  }
  return res.blob();
}
