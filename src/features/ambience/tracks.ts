// Reading-ambience tracks. Like book text, the audio isn't bundled — the
// trimmed ~2MB loops live in a public Supabase Storage bucket ("ambience",
// uploaded once by scripts/upload-ambience.mjs) and stream on first play,
// then expo-audio caches them to disk so later sessions play offline.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

// Public Storage object URL (no auth needed — the bucket is public).
function ambienceUrl(file: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/ambience/${file}`;
}

export type AmbienceTrack = {
  id: string;
  label: string;
  // Short line under the label in the picker, sets the scene.
  hint: string;
  url: string;
  isPremium?: boolean;
  durationSeconds: number;
  approxFileSizeKb: number;
  license: string;
  attribution: string;
  version: number;
};

// "off" is modelled as the absence of a track (null), not an entry here.
// Catalog includes 2 complete free soundscapes and 12 curated artisan premium soundscapes (FULLAPP §14.1).
export const AMBIENCE_TRACKS: AmbienceTrack[] = [
  {
    id: 'forest-brook',
    label: 'Forest brook',
    hint: 'A gentle stream and birdsong',
    url: ambienceUrl('forest-brook.mp3'),
    isPremium: false,
    durationSeconds: 180,
    approxFileSizeKb: 2150,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
  {
    id: 'rain-path',
    label: 'Rain on the path',
    hint: 'Steady gentle rain through trees',
    url: ambienceUrl('rain-path.mp3'),
    isPremium: false,
    durationSeconds: 180,
    approxFileSizeKb: 2200,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
  {
    id: 'misty-rain',
    label: 'Misty rain',
    hint: 'A soft walk in the drizzle',
    url: ambienceUrl('misty-rain.mp3'),
    isPremium: true,
    durationSeconds: 180,
    approxFileSizeKb: 1950,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
  {
    id: 'heavy-rain',
    label: 'Heavy rain',
    hint: 'Rhythmic downpour on the roof',
    url: ambienceUrl('heavy-rain.mp3'),
    isPremium: true,
    durationSeconds: 180,
    approxFileSizeKb: 2350,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
  {
    id: 'rain-window',
    label: 'Rain on a window',
    hint: 'Gentle droplets on glass panes',
    url: ambienceUrl('rain-window.mp3'),
    isPremium: true,
    durationSeconds: 180,
    approxFileSizeKb: 2050,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
  {
    id: 'fireplace',
    label: 'Fireplace',
    hint: 'Crackling hearth embers and warm wood',
    url: ambienceUrl('fireplace.mp3'),
    isPremium: true,
    durationSeconds: 180,
    approxFileSizeKb: 2100,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
  {
    id: 'forest-birds',
    label: 'Forest birds',
    hint: 'Dawn birdsong in an ancient canopy',
    url: ambienceUrl('forest-birds.mp3'),
    isPremium: true,
    durationSeconds: 180,
    approxFileSizeKb: 2250,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
  {
    id: 'wind-trees',
    label: 'Wind through trees',
    hint: 'Soft breeze rustling pine branches',
    url: ambienceUrl('wind-trees.mp3'),
    isPremium: true,
    durationSeconds: 180,
    approxFileSizeKb: 2000,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
  {
    id: 'ocean-waves',
    label: 'Ocean waves',
    hint: 'Rhythmic coastal swells and surf',
    url: ambienceUrl('ocean-waves.mp3'),
    isPremium: true,
    durationSeconds: 180,
    approxFileSizeKb: 2400,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
  {
    id: 'distant-thunder',
    label: 'Distant thunder',
    hint: 'Low rumbling storm across the valley',
    url: ambienceUrl('distant-thunder.mp3'),
    isPremium: true,
    durationSeconds: 180,
    approxFileSizeKb: 2150,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
  {
    id: 'quiet-cafe',
    label: 'Quiet café',
    hint: 'Subtle espresso hum and gentle quietude',
    url: ambienceUrl('quiet-cafe.mp3'),
    isPremium: true,
    durationSeconds: 180,
    approxFileSizeKb: 2200,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
  {
    id: 'old-library',
    label: 'Old library',
    hint: 'Turning parchment pages and slow pendulum',
    url: ambienceUrl('old-library.mp3'),
    isPremium: true,
    durationSeconds: 180,
    approxFileSizeKb: 1850,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
  {
    id: 'victorian-study',
    label: 'Victorian study',
    hint: 'Leather chairs and a softly burning grate',
    url: ambienceUrl('victorian-study.mp3'),
    isPremium: true,
    durationSeconds: 180,
    approxFileSizeKb: 2050,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
  {
    id: 'snowstorm',
    label: 'Snowstorm',
    hint: 'Whistling Arctic gusts beyond the glass',
    url: ambienceUrl('snowstorm.mp3'),
    isPremium: true,
    durationSeconds: 180,
    approxFileSizeKb: 2100,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
  {
    id: 'midnight-forest',
    label: 'Midnight forest',
    hint: 'Night breeze, distant owls, and crickets',
    url: ambienceUrl('midnight-forest.mp3'),
    isPremium: true,
    durationSeconds: 180,
    approxFileSizeKb: 2200,
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Freesound / Lamplight Audio Archive',
    version: 1,
  },
];

export function ambienceTrackById(id: string | null): AmbienceTrack | null {
  if (!id) return null;
  return AMBIENCE_TRACKS.find((t) => t.id === id) ?? null;
}
