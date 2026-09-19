import { describe, it, expect } from 'vitest';
import { MAX_CACHE_BYTES, MAX_CACHE_ENTRIES } from '../offlineCache';

describe('offlineCache quotas', () => {
  it('exports positive quota limits', () => {
    expect(MAX_CACHE_BYTES).toBeGreaterThan(1024 * 1024);
    expect(MAX_CACHE_ENTRIES).toBeGreaterThan(10);
  });
});
