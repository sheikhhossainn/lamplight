import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeEpubChecksum,
  verifyRestoredEpubChecksum,
  validateEpubUploadQuota,
  reconcileReadingPositionProgress,
  backupImportedEpub,
  MAX_EPUB_FILE_SIZE_BYTES,
  MAX_ACCOUNT_EPUB_STORAGE_BYTES,
} from '../src/features/sync/epubBackupService';

test('SYNC-02: EPUB Checksum computation and verification', async (t) => {
  await t.test('computes deterministic SHA-256 hash for sample EPUB content', async () => {
    const content = 'PK\x03\x04mimetypeapplication/epub+zipMETA-INF/container.xml';
    const checksum1 = await computeEpubChecksum(content);
    const checksum2 = await computeEpubChecksum(content);

    assert.equal(typeof checksum1, 'string');
    assert.equal(checksum1.length, 64);
    assert.equal(checksum1, checksum2);
  });

  await t.test('verifyRestoredEpubChecksum confirms integrity and catches corrupted content', async () => {
    const original = 'Clean valid EPUB content stream';
    const checksum = await computeEpubChecksum(original);

    // Exact match
    const isValid = await verifyRestoredEpubChecksum(original, checksum);
    assert.equal(isValid, true);

    // Corrupted bytes
    const corrupted = 'Tampered or truncated EPUB content stream';
    const isCorruptValid = await verifyRestoredEpubChecksum(corrupted, checksum);
    assert.equal(isCorruptValid, false);

    // Empty or missing checksum fails safely
    const isMissingValid = await verifyRestoredEpubChecksum(original, '');
    assert.equal(isMissingValid, false);
  });
});

test('SYNC-02: Storage quota enforcement (file limit 25MB, account 250MB)', async (t) => {
  await t.test('allows uploads within individual and account storage bounds', () => {
    const fileSize = 8 * 1024 * 1024; // 8MB
    const currentAccountUsage = 50 * 1024 * 1024; // 50MB

    const res = validateEpubUploadQuota(fileSize, currentAccountUsage);
    assert.equal(res.allowed, true);
    assert.equal(res.fileSizeBytes, fileSize);
    assert.equal(res.projectedAccountBytes, 58 * 1024 * 1024);
  });

  await t.test('rejects individual files exceeding 25MB ceiling without throwing', () => {
    const oversizedFile = MAX_EPUB_FILE_SIZE_BYTES + 1024; // 25MB + 1KB
    const res = validateEpubUploadQuota(oversizedFile, 0);

    assert.equal(res.allowed, false);
    assert.ok(res.reason?.includes('exceeds maximum allowed limit of 25MB'));
  });

  await t.test('rejects upload when account total exceeds 250MB quota', () => {
    const fileSize = 15 * 1024 * 1024; // 15MB
    const currentAccountUsage = MAX_ACCOUNT_EPUB_STORAGE_BYTES - 5 * 1024 * 1024; // 245MB

    const res = validateEpubUploadQuota(fileSize, currentAccountUsage);
    assert.equal(res.allowed, false);
    assert.ok(res.reason?.includes('Account storage limit (250MB) reached'));
  });
});

test('SYNC-02 & SYNC-03: Conflict resolution policy (furthest progress wins; newest breaks ties)', async (t) => {
  await t.test('further chapter wins regardless of timestamps', () => {
    const local = { chapterIndex: 2, pageIndex: 5, percentComplete: 0.25, updatedAt: 1000 };
    const remote = { chapterIndex: 4, pageIndex: 1, percentComplete: 0.45, updatedAt: 500 };

    assert.equal(reconcileReadingPositionProgress(local, remote), 'remote');

    // Inverted: local is further ahead
    assert.equal(reconcileReadingPositionProgress(remote, local), 'local');
  });

  await t.test('same chapter: further page index wins', () => {
    const local = { chapterIndex: 3, pageIndex: 8, percentComplete: 0.35, updatedAt: 1000 };
    const remote = { chapterIndex: 3, pageIndex: 2, percentComplete: 0.31, updatedAt: 2000 };

    // Local page 8 beats remote page 2 even if remote timestamp is newer
    assert.equal(reconcileReadingPositionProgress(local, remote), 'local');
  });

  await t.test('same chapter and page: newest location breaks ties', () => {
    const local = { chapterIndex: 3, pageIndex: 5, percentComplete: 0.35, updatedAt: 1000 };
    const remote = { chapterIndex: 3, pageIndex: 5, percentComplete: 0.35, updatedAt: 2000 };

    // Remote is newer
    assert.equal(reconcileReadingPositionProgress(local, remote), 'remote');

    // Local is newer
    const localNewer = { ...local, updatedAt: 3000 };
    assert.equal(reconcileReadingPositionProgress(localNewer, remote), 'local');
  });

  await t.test('never replaces newer local progress with older remote progress', () => {
    const local = { chapterIndex: 5, pageIndex: 1, percentComplete: 0.5, updatedAt: 5000 };
    const olderRemote = { chapterIndex: 3, pageIndex: 1, percentComplete: 0.3, updatedAt: 2000 };

    assert.equal(reconcileReadingPositionProgress(local, olderRemote), 'local');
  });
});

test('SYNC-02: Premium entitlement boundary for cloud backup', async (t) => {
  await t.test('blocks unentitled free tier callers gracefully without throwing', async () => {
    const res = await backupImportedEpub({
      bookId: 'local-test-book',
      title: 'Personal Book',
      author: 'Unknown',
      base64: 'UEsDBAoAAAAAA...',
    });

    assert.equal(res.success, false);
    assert.ok(
      res.error?.includes('Lamplight Premium') || res.error?.includes('authenticated'),
    );
  });
});
