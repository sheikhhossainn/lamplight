import { getSetting, setSetting } from '@/db/repositories/appSettings';

const STORAGE_KEY = 'last_seen_whats_new';

export type ChangelogEntry = {
  // Bump for every OTA push that has user-visible changes worth announcing.
  // Skip entries for pushes with nothing to say — not every update needs one.
  version: string;
  headline: string;
  changes: string[];
};

// Newest first. Only the top entry is ever shown — someone who skipped two
// updates in a row sees one card for the latest, not a backlog.
const CHANGELOG: ChangelogEntry[] = [
  // {
  //   version: '1',
  //   headline: "What's new",
  //   changes: ['Added flashcard deck reminders', 'Fixed Bible chapter numbers going out of order'],
  // },
];

let lastSeenVersion: string | null = null;
let hydrated = false;

export async function hydrateWhatsNewStatus(): Promise<void> {
  if (hydrated) return;
  lastSeenVersion = await getSetting(STORAGE_KEY);
  hydrated = true;
}

export function getPendingWhatsNew(): ChangelogEntry | null {
  const latest = CHANGELOG[0];
  if (!latest || latest.version === lastSeenVersion) return null;
  return latest;
}

export function markWhatsNewSeen(version: string): void {
  lastSeenVersion = version;
  void setSetting(STORAGE_KEY, version);
}
