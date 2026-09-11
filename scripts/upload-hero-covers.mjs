import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ARTIFACT_DIR = 'C:/Users/Mahi-Shahi/.gemini/antigravity/brain/f1d36028-69ad-4beb-8785-d29a4b77d05c';

const COVERS_TO_UPLOAD = [
  {
    localFile: path.join(ARTIFACT_DIR, 'cover_kokoro_1789117760361.jpg'),
    remoteName: 'ja-kokoro.jpg',
    bookId: 'ja-kokoro',
  },
  {
    localFile: path.join(ARTIFACT_DIR, 'cover_botchan_1789117561948.jpg'),
    remoteName: 'ja-botchan.jpg',
    bookId: 'ja-botchan',
  },
  {
    localFile: path.join(ARTIFACT_DIR, 'cover_rashomon_1789117783560.jpg'),
    remoteName: 'ja-rashomon.jpg',
    bookId: 'ja-rashomon',
  },
  {
    localFile: path.join(process.cwd(), 'real_yun.jpg'),
    remoteName: 'ko-yun-dong-ju.jpg',
    bookId: 'ko-yun-dong-ju',
  },
  {
    localFile: path.join(process.cwd(), 'jindallae.jpg'),
    remoteName: 'ko-jindallae.jpg',
    bookId: 'ko-jindallae',
  },
];

async function uploadAll() {
  const uploadedUrls = {};

  for (const item of COVERS_TO_UPLOAD) {
    if (!fs.existsSync(item.localFile)) {
      console.warn(`File not found: ${item.localFile}`);
      continue;
    }

    const buffer = fs.readFileSync(item.localFile);
    console.log(`Uploading ${item.remoteName} (${buffer.length} bytes)...`);

    const { data, error } = await supabase.storage
      .from('book-covers')
      .upload(item.remoteName, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error(`Failed to upload ${item.remoteName}:`, error);
    } else {
      const { data: publicData } = supabase.storage
        .from('book-covers')
        .getPublicUrl(item.remoteName);
      console.log(`Uploaded ${item.remoteName} -> ${publicData.publicUrl}`);
      uploadedUrls[item.bookId] = publicData.publicUrl;

      // Update in public.books table
      const { error: dbError } = await supabase
        .from('books')
        .update({ cover_url: publicData.publicUrl })
        .eq('id', item.bookId);

      if (dbError) {
        console.error(`Failed to update DB for ${item.bookId}:`, dbError);
      } else {
        console.log(`Updated DB cover_url for ${item.bookId}`);
      }
    }
  }

  // Also clear broken Open Library covers from public.books for remaining Japanese/Korean books
  const booksToClear = [
    'ja-hashire-merosu',
    'ja-gingatetsudo',
    'ja-gon-gitsune',
    'ko-nalgae',
    'ko-unsu-joeun-nal',
    'ko-bom-bom',
  ];

  for (const bId of booksToClear) {
    const { error: clearErr } = await supabase
      .from('books')
      .update({ cover_url: null })
      .eq('id', bId);
    if (!clearErr) {
      console.log(`Cleared dummy cover for ${bId} -> null (renders authentic typographic spine)`);
    }
  }

  console.log('Upload and DB sync complete!');
}

uploadAll().catch(console.error);
