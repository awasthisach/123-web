import { describe, it, expect } from 'vitest';
import { MAX_CACHE_BYTES, MAX_CACHE_ENTRIES } from '../offlineCache';
import { findDuplicates } from '../duplicateEngine';
import type { DriveFile } from '../../types';

describe('offlineCache quotas', () => {
  it('exports positive quota limits', () => {
    expect(MAX_CACHE_BYTES).toBeGreaterThan(1024 * 1024);
    expect(MAX_CACHE_ENTRIES).toBeGreaterThan(10);
  });
});

function makeFile(p: Partial<DriveFile> & { id: string; name: string }): DriveFile {
  return {
    mimeType: 'application/pdf',
    size: 1000,
    modifiedTime: '2024-01-01T00:00:00.000Z',
    createdTime: '2024-01-01T00:00:00.000Z',
    category: 'document',
    isOffline: false,
    isEncrypted: false,
    contentHash: 'gdrive-' + p.id,
    tags: [],
    semanticSummary: p.name,
    starred: false,
    isGoogleDriveItem: true,
    ...p,
  } as DriveFile;
}

describe('duplicate confirmation semantics', () => {
  it('marks size/name groups without sha256 prefix', () => {
    const groups = findDuplicates([
      makeFile({ id: '1', name: 'a.pdf', size: 100 }),
      makeFile({ id: '2', name: 'a.pdf', size: 100 }),
    ]);
    expect(groups[0].hash.startsWith('sha256:')).toBe(false);
  });

  it('marks offline-hash groups with sha256 prefix', () => {
    const groups = findDuplicates([
      makeFile({ id: '1', name: 'x.pdf', contentHash: 'sha256:abc' }),
      makeFile({ id: '2', name: 'y.pdf', contentHash: 'sha256:abc' }),
    ]);
    expect(groups[0].hash.startsWith('sha256:')).toBe(true);
  });
});
