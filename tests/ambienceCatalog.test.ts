import test from 'node:test';
import assert from 'node:assert/strict';

import { AMBIENCE_TRACKS, ambienceTrackById } from '../src/features/ambience/tracks.ts';
import {
  getAmbienceTrackId,
  setAmbienceTrackId,
  getAmbienceVolume,
  setAmbienceVolume,
  startAmbiencePreview,
  cancelAmbiencePreview,
  getAmbiencePreviewTrackId,
  setAmbienceSleepTimer,
  getAmbienceSleepTimer,
  getStopOnReaderClose,
  setStopOnReaderClose,
} from '../src/features/ambience/ambiencePreference.ts';

test('ATM-01: Ambient sound catalog', async (t) => {
  // Reset preferences before tests
  setAmbienceTrackId(null);
  setAmbienceVolume(0.7);
  setAmbienceSleepTimer(null);
  setStopOnReaderClose(true);

  await t.test('contains all soundscapes in catalog', () => {
    assert.ok(AMBIENCE_TRACKS.length >= 14);
  });

  await t.test('keeps at least two complete free soundscapes', () => {
    const freeTracks = AMBIENCE_TRACKS.filter((tr) => !tr.isPremium);
    assert.ok(freeTracks.length >= 2, 'Must have at least two free soundscapes');
    const freeIds = freeTracks.map((tr) => tr.id);
    assert.ok(freeIds.includes('forest-brook'));
    assert.ok(freeIds.includes('rain-path'));
  });

  await t.test('contains the 12 required artisan premium soundscapes', () => {
    const premiumTracks = AMBIENCE_TRACKS.filter((tr) => tr.isPremium);
    assert.ok(premiumTracks.length >= 12);

    const premiumIds = new Set(premiumTracks.map((tr) => tr.id));
    const required = [
      'heavy-rain',
      'rain-window',
      'fireplace',
      'forest-birds',
      'wind-trees',
      'ocean-waves',
      'distant-thunder',
      'quiet-cafe',
      'old-library',
      'victorian-study',
      'snowstorm',
      'midnight-forest',
    ];
    for (const req of required) {
      assert.ok(premiumIds.has(req), `Premium catalog missing: ${req}`);
    }
  });

  await t.test('guarantees complete metadata for every track', () => {
    for (const track of AMBIENCE_TRACKS) {
      assert.ok(track.id, 'track must have id');
      assert.ok(track.label, 'track must have label');
      assert.ok(track.hint, 'track must have hint');
      assert.ok(track.url.includes('/storage/v1/object/public/ambience/'), 'valid bucket url');
      assert.equal(track.durationSeconds, 180);
      assert.ok(track.approxFileSizeKb > 1000);
      assert.ok(track.license.includes('CC0 1.0 Universal'));
      assert.ok(track.attribution.includes('Lamplight Audio Archive'));
      assert.ok(track.version >= 1);
    }
  });

  await t.test('resolves tracks by ID correctly', () => {
    const brook = ambienceTrackById('forest-brook');
    assert.ok(brook !== null);
    assert.equal(brook?.label, 'Forest brook');

    const nonExistent = ambienceTrackById('non-existent-track');
    assert.equal(nonExistent, null);

    assert.equal(ambienceTrackById(null), null);
  });

  await t.test('updates selected track ID and clamps volume between 0 and 1', () => {
    setAmbienceTrackId('rain-path');
    assert.equal(getAmbienceTrackId(), 'rain-path');

    setAmbienceVolume(1.5);
    assert.equal(getAmbienceVolume(), 1);

    setAmbienceVolume(-0.5);
    assert.equal(getAmbienceVolume(), 0);

    setAmbienceVolume(0.5);
    assert.equal(getAmbienceVolume(), 0.5);
  });

  await t.test('toggles stop-on-reader-close preference', () => {
    assert.equal(getStopOnReaderClose(), true);
    setStopOnReaderClose(false);
    assert.equal(getStopOnReaderClose(), false);
    setStopOnReaderClose(true);
    assert.equal(getStopOnReaderClose(), true);
  });

  await t.test('handles 30-second preview mechanics and manual cancellation', () => {
    startAmbiencePreview('ocean-waves', 30);
    assert.equal(getAmbiencePreviewTrackId(), 'ocean-waves');
    assert.equal(getAmbienceTrackId(), 'ocean-waves');

    cancelAmbiencePreview();
    assert.equal(getAmbiencePreviewTrackId(), null);
    assert.equal(getAmbienceTrackId(), null);
  });

  await t.test('cancels preview if user manually sets a different track or Off', () => {
    startAmbiencePreview('forest-birds', 30);
    assert.equal(getAmbiencePreviewTrackId(), 'forest-birds');

    setAmbienceTrackId('forest-brook');
    assert.equal(getAmbiencePreviewTrackId(), null);
    assert.equal(getAmbienceTrackId(), 'forest-brook');
  });

  await t.test('sets and manages sleep timer options', () => {
    setAmbienceTrackId('rain-path');
    setAmbienceSleepTimer(15);
    assert.equal(getAmbienceSleepTimer(), 15);

    setAmbienceSleepTimer(null);
    assert.equal(getAmbienceSleepTimer(), null);
  });
});
