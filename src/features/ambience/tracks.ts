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
};

// "off" is modelled as the absence of a track (null), not an entry here.
export const AMBIENCE_TRACKS: AmbienceTrack[] = [
  {
    id: 'forest-brook',
    label: 'Forest brook',
    hint: 'A stream and birdsong',
    url: ambienceUrl('forest-brook.mp3'),
  },
  {
    id: 'rain-path',
    label: 'Rain on the path',
    hint: 'Steady rain through trees',
    url: ambienceUrl('rain-path.mp3'),
  },
  {
    id: 'misty-rain',
    label: 'Misty rain',
    hint: 'A soft walk in the drizzle',
    url: ambienceUrl('misty-rain.mp3'),
  },
];

export function ambienceTrackById(id: string | null): AmbienceTrack | null {
  if (!id) return null;
  return AMBIENCE_TRACKS.find((t) => t.id === id) ?? null;
}
