import { DriveFile, DuplicateGroup } from '../types';

export function findDuplicates(files: DriveFile[]): DuplicateGroup[] {
  const hashMap = new Map<string, DriveFile[]>();

  files.forEach(file => {
    if (!file.contentHash) return;
    const existing = hashMap.get(file.contentHash) || [];
    existing.push(file);
    hashMap.set(file.contentHash, existing);
  });

  const duplicateGroups: DuplicateGroup[] = [];

  hashMap.forEach((groupFiles, hash) => {
    if (groupFiles.length > 1) {
      const singleSize = groupFiles[0].size;
      const totalSize = singleSize * groupFiles.length;
      const reclaimableSize = singleSize * (groupFiles.length - 1);

      // Sort files by modifiedTime ascending (oldest first)
      const sorted = [...groupFiles].sort(
        (a, b) => new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime()
      );

      duplicateGroups.push({
        hash,
        fileCount: sorted.length,
        totalSize,
        reclaimableSize,
        files: sorted,
      });
    }
  });

  return duplicateGroups;
}
