import { canUse } from '@/features/subscription/subscriptionState';
import { getSession } from '@/lib/supabaseAuth';

export const MAX_EPUB_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB per book
export const MAX_ACCOUNT_EPUB_STORAGE_BYTES = 250 * 1024 * 1024; // 250 MB total per account

export interface EpubBackupMetadata {
  checksum: string;
  byteSize: number;
  originalFilename: string;
  contentType: 'application/epub+zip';
  parserVersion: 'v1';
  storagePath: string;
  uploadedAt: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  fileSizeBytes: number;
  projectedAccountBytes: number;
}

/**
 * Computes a standard SHA-256 checksum string (hex) from text or byte buffer.
 */
export async function computeEpubChecksum(content: string | Uint8Array): Promise<string> {
  let bytes: Uint8Array;
  if (typeof content === 'string') {
    if (typeof TextEncoder !== 'undefined') {
      bytes = new TextEncoder().encode(content);
    } else {
      bytes = Uint8Array.from(Buffer.from(content));
    }
  } else {
    bytes = content;
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates individual EPUB file size and account storage limit.
 * Does not throw, ensuring quota failures never damage local reading.
 */
export function validateEpubUploadQuota(
  fileSizeBytes: number,
  currentAccountUsageBytes = 0,
): QuotaCheckResult {
  if (fileSizeBytes > MAX_EPUB_FILE_SIZE_BYTES) {
    return {
      allowed: false,
      reason: `File size (${(fileSizeBytes / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of 25MB.`,
      fileSizeBytes,
      projectedAccountBytes: currentAccountUsageBytes + fileSizeBytes,
    };
  }

  const projectedTotal = currentAccountUsageBytes + fileSizeBytes;
  if (projectedTotal > MAX_ACCOUNT_EPUB_STORAGE_BYTES) {
    return {
      allowed: false,
      reason: `Account storage limit (250MB) reached. Current usage: ${(currentAccountUsageBytes / (1024 * 1024)).toFixed(1)}MB.`,
      fileSizeBytes,
      projectedAccountBytes: projectedTotal,
    };
  }

  return {
    allowed: true,
    fileSizeBytes,
    projectedAccountBytes: projectedTotal,
  };
}

/**
 * Verifies that a restored EPUB matches its recorded checksum.
 */
export async function verifyRestoredEpubChecksum(
  content: string | Uint8Array,
  expectedChecksum: string,
): Promise<boolean> {
  if (!expectedChecksum) return false;
  const actual = await computeEpubChecksum(content);
  return actual.toLowerCase() === expectedChecksum.toLowerCase();
}

/**
 * Reconciles reading progress per FULLAPP §15.3:
 * "Reading position: Furthest progress wins; newest location breaks ties."
 */
export function reconcileReadingPositionProgress(
  local: { chapterIndex: number; pageIndex: number; percentComplete: number; updatedAt: number },
  remote: { chapterIndex: number; pageIndex: number; percentComplete: number; updatedAt: number },
): 'local' | 'remote' {
  // 1. Furthest progress by chapter index
  if (remote.chapterIndex > local.chapterIndex) return 'remote';
  if (local.chapterIndex > remote.chapterIndex) return 'local';

  // 2. Same chapter: compare page index
  if (remote.pageIndex > local.pageIndex) return 'remote';
  if (local.pageIndex > remote.pageIndex) return 'local';

  // 3. Same chapter and page: compare percentage complete if distinct
  if (remote.percentComplete > local.percentComplete + 0.01) return 'remote';
  if (local.percentComplete > remote.percentComplete + 0.01) return 'local';

  // 4. Exact tie: newest location breaks ties
  if (remote.updatedAt > local.updatedAt) return 'remote';
  return 'local';
}

/**
 * Backs up an imported EPUB to private Supabase Storage if user is entitled to cloud sync.
 * Quota or network failures log a warning and return failure status without affecting local book.
 */
export async function backupImportedEpub(input: {
  bookId: string;
  title: string;
  author: string;
  base64: string;
  filename?: string;
  currentAccountUsageBytes?: number;
}): Promise<{ success: boolean; metadata?: EpubBackupMetadata; error?: string }> {
  // 1. Entitlement check (Premium feature)
  if (!canUse('cloud_sync')) {
    return { success: false, error: 'Cloud sync and EPUB backup require Lamplight Premium.' };
  }

  // 2. Auth session check
  const session = await getSession().catch(() => null);
  if (!session?.userId || !session.accessToken) {
    return { success: false, error: 'User must be authenticated to backup EPUBs.' };
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { success: false, error: 'Supabase configuration missing.' };
  }

  // 3. Calculate size and checksum
  const byteSize = Math.round((input.base64.length * 3) / 4);
  const quota = validateEpubUploadQuota(byteSize, input.currentAccountUsageBytes ?? 0);
  if (!quota.allowed) {
    return { success: false, error: quota.reason };
  }

  const checksum = await computeEpubChecksum(input.base64);
  const storagePath = `${session.userId}/${input.bookId}.epub`;
  const metadata: EpubBackupMetadata = {
    checksum,
    byteSize,
    originalFilename: input.filename || `${input.title}.epub`,
    contentType: 'application/epub+zip',
    parserVersion: 'v1',
    storagePath,
    uploadedAt: new Date().toISOString(),
  };

  try {
    // 4. Upload binary to private user_epubs bucket via Supabase Storage REST API
    const binaryData = Buffer.from(input.base64, 'base64');
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/user_epubs/${encodeURIComponent(storagePath)}`,
      {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/epub+zip',
          'x-upsert': 'true',
        },
        body: binaryData,
      },
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      return { success: false, error: `Upload failed with status ${uploadRes.status}: ${errText}` };
    }

    // 5. Register library_items row with backup metadata
    await fetch(`${supabaseUrl}/rest/v1/library_items`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        owner_id: session.userId,
        catalog_book_id: input.bookId,
        title: input.title,
        author: input.author,
        is_imported: true,
        metadata,
        updated_at: new Date().toISOString(),
      }),
    });

    return { success: true, metadata };
  } catch (err: unknown) {
    const errorMsg = (err as Error)?.message || 'Unexpected network error during backup';
    return { success: false, error: errorMsg };
  }
}

/**
 * Permanently deletes remote EPUB object and library_item record.
 */
export async function deleteRemoteEpubBackup(bookId: string): Promise<boolean> {
  const session = await getSession().catch(() => null);
  if (!session?.userId || !session.accessToken) return false;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return false;

  const storagePath = `${session.userId}/${bookId}.epub`;

  try {
    // 1. Delete from storage bucket
    await fetch(`${supabaseUrl}/storage/v1/object/user_epubs`, {
      method: 'DELETE',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: [storagePath] }),
    });

    // 2. Delete library_items record
    await fetch(
      `${supabaseUrl}/rest/v1/library_items?owner_id=eq.${session.userId}&catalog_book_id=eq.${encodeURIComponent(bookId)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    return true;
  } catch {
    return false;
  }
}
