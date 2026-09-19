import { describe, it, expect } from 'vitest';
import { runSemanticSearch } from '../searchEngine';
import type { DriveFile } from '../../types';

const base: DriveFile = {
  id: '1',
  name: 'Fiscal Audit Report 2024.pdf',
  mimeType: 'application/pdf',
  size: 10,
  modifiedTime: '2024-01-01T00:00:00.000Z',
  createdTime: '2024-01-01T00:00:00.000Z',
  category: 'document',
  isOffline: false,
  isEncrypted: false,
  contentHash: 'gdrive-1',
  tags: ['finance', 'audit'],
  semanticSummary: 'Yearly fiscal audit for regional sales',
  starred: false,
  isGoogleDriveItem: true,
};

describe('runSemanticSearch', () => {
  it('matches filename keywords', () => {
    const results = runSemanticSearch('fiscal audit', [base]);
    expect(results.length).toBe(1);
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('filters by google_drive category', () => {
    const local = { ...base, id: '2', isGoogleDriveItem: false, name: 'local fiscal' };
    const results = runSemanticSearch('fiscal', [base, local], 'google_drive');
    expect(results.every(r => r.file.isGoogleDriveItem)).toBe(true);
  });

  it('returns index when query empty', () => {
    const results = runSemanticSearch('', [base]);
    expect(results.length).toBe(1);
  });
});
