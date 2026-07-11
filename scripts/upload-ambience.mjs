// One-time (re-runnable) upload of the trimmed reading-ambience loops to a
// public Supabase Storage bucket. The raw hours-long source recordings never
// leave this machine (assets/nature-music/ is gitignored) — only the ~2MB
// trimmed loop exports get uploaded, and the app streams/caches from their
// public URL (features/ambience/tracks.ts), the same way book text is
// fetched on-device rather than bundled.
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
// (service-role key never committed — same convention as sync-books.mjs).
// Usage: node scripts/upload-ambience.mjs <path-to-trimmed-files-dir>
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BUCKET = 'ambience';
const sourceDir = process.argv[2];
if (!sourceDir) {
  throw new Error('Usage: node scripts/upload-ambience.mjs <path-to-trimmed-files-dir>');
}

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Failed to list buckets: ${error.message}`);
  if (buckets.some((b) => b.name === BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: '10MB',
  });
  if (createError) throw new Error(`Failed to create bucket: ${createError.message}`);
  console.log(`Created public bucket "${BUCKET}".`);
}

async function run() {
  await ensureBucket();

  const files = (await readdir(sourceDir)).filter((f) => f.endsWith('.mp3'));
  if (files.length === 0) throw new Error(`No .mp3 files found in ${sourceDir}`);

  for (const file of files) {
    const buffer = await readFile(path.join(sourceDir, file));
    const { error } = await supabase.storage.from(BUCKET).upload(file, buffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });
    if (error) throw new Error(`Upload failed for ${file}: ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(file);
    console.log(`${file} -> ${data.publicUrl}`);
  }
}

await run();
