import { DriveFile, FolderItem, FileCategory } from '../types';
import { getCategoryFromMime } from './driveApi';

const FOLDER_COLORS = ['blue', 'emerald', 'purple', 'amber', 'rose', 'indigo', 'cyan', 'zinc'];

export interface DriveFetchResult {
  files: DriveFile[];
  folders: FolderItem[];
}

export type DriveFileTypeFilter = 'all' | 'documents' | 'images' | 'videos' | 'spreadsheets' | 'pdfs' | 'folders';

function buildDriveQuery(fileType: DriveFileTypeFilter = 'all'): string {
  const base = 'trashed=false';

  switch (fileType) {
    case 'documents':
      return `${base} and (mimeType='application/pdf' or mimeType='application/msword' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType='application/vnd.google-apps.document' or mimeType='text/plain' or mimeType='application/rtf')`;
    case 'pdfs':
      return `${base} and mimeType='application/pdf'`;
    case 'images':
      return `${base} and (mimeType contains 'image/' or mimeType='application/vnd.google-apps.photo')`;
    case 'videos':
      return `${base} and (mimeType contains 'video/' or mimeType='application/vnd.google-apps.video')`;
    case 'spreadsheets':
      return `${base} and (mimeType='application/vnd.ms-excel' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.google-apps.spreadsheet' or mimeType='text/csv')`;
    case 'folders':
      return `${base} and mimeType='application/vnd.google-apps.folder'`;
    case 'all':
    default:
      return base;
  }
}

export async function fetchGoogleDriveData(
  accessToken: string,
  fileType: DriveFileTypeFilter = 'all',
  maxPages: number = 4
): Promise<DriveFetchResult> {
  const fields = 'files(id,name,mimeType,size,modifiedTime,createdTime,thumbnailLink,webViewLink,iconLink,parents,trashed,description,starred),nextPageToken';
  const query = buildDriveQuery(fileType);
  const rawItems: any[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      pageSize: '500',
      fields,
      q: query,
      orderBy: 'modifiedTime desc',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.error?.message || `Google Drive API error: ${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    const data = await response.json();
    rawItems.push(...(data.files || []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  const folders: FolderItem[] = [];
  const files: DriveFile[] = [];
  let colorIdx = 0;

  for (const item of rawItems) {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      folders.push({
        id: item.id,
        name: item.name,
        color: FOLDER_COLORS[colorIdx % FOLDER_COLORS.length],
        description: item.description || `Google Drive folder with ${item.name}`,
        createdAt: item.createdTime,
      });
      colorIdx++;
    } else {
      const category = getCategoryFromMime(item.mimeType || '', item.name || '');
      const primaryParent = item.parents && item.parents.length > 0 ? item.parents[0] : undefined;

      files.push({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType || 'application/octet-stream',
        size: item.size ? parseInt(item.size, 10) : 1024,
        modifiedTime: item.modifiedTime || new Date().toISOString(),
        createdTime: item.createdTime || new Date().toISOString(),
        category,
        folderId: primaryParent,
        thumbnailUrl: item.thumbnailLink,
        webViewLink: item.webViewLink,
        iconLink: item.iconLink,
        parentIds: item.parents || [],
        isGoogleDriveItem: true,
        isOffline: false,
        isEncrypted: false,
        contentHash: `gdrive-${item.id}-${item.size || 0}`,
        tags: ['google-drive', category, primaryParent ? 'categorized' : 'root'],
        semanticSummary: item.description || `Google Drive file "${item.name}" of type ${item.mimeType}`,
        starred: Boolean(item.starred),
      });
    }
  }

  return { files, folders };
}

export async function moveGoogleDriveFile(
  accessToken: string,
  fileId: string,
  newFolderId: string,
  currentParentIds: string[] = []
): Promise<void> {
  let previousParents = currentParentIds.join(',');

  if (!previousParents) {
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      previousParents = (meta.parents || []).join(',');
    }
  }

  const params = new URLSearchParams();
  if (newFolderId && newFolderId !== 'root') {
    params.set('addParents', newFolderId);
  }
  if (previousParents) {
    params.set('removeParents', previousParents);
  }
  params.set('fields', 'id,parents');

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?${params.toString()}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to move file: ${response.status}`);
  }
}

export async function createGoogleDriveFolder(
  accessToken: string,
  name: string
): Promise<{ id: string; name: string }> {
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to create folder: ${response.status}`);
  }

  return response.json();
}

export async function deleteGoogleDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to delete file: ${response.status}`);
  }
}
