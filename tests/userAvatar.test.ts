import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRESET_AVATARS,
  getPresetAvatar,
  isPresetAvatarKey,
  isRemoteImageUrl,
} from '../src/features/account/userAvatar';

test('AVATAR-01 provides 8 curated literary presets', () => {
  assert.equal(PRESET_AVATARS.length, 8);
  const ids = PRESET_AVATARS.map((p) => p.id);
  assert.ok(ids.includes('flame'));
  assert.ok(ids.includes('owl'));
  assert.ok(ids.includes('scholar'));
  assert.ok(ids.includes('quill'));
  assert.ok(ids.includes('coffee'));
  assert.ok(ids.includes('moon'));
  assert.ok(ids.includes('wanderer'));
  assert.ok(ids.includes('sanctuary'));
});

test('AVATAR-02 resolves preset avatars with or without preset: prefix', () => {
  const p1 = getPresetAvatar('flame');
  assert.ok(p1);
  assert.equal(p1?.id, 'flame');
  assert.equal(p1?.label, 'The Lamplight');

  const p2 = getPresetAvatar('preset:owl');
  assert.ok(p2);
  assert.equal(p2?.id, 'owl');
  assert.equal(p2?.label, 'Night Owl');

  assert.equal(getPresetAvatar('unknown_avatar'), null);
  assert.equal(getPresetAvatar(null), null);
});

test('AVATAR-03 distinguishes remote URLs from preset keys', () => {
  assert.equal(isRemoteImageUrl('https://lh3.googleusercontent.com/a/abc'), true);
  assert.equal(isRemoteImageUrl('http://example.com/avatar.jpg'), true);
  assert.equal(isRemoteImageUrl('preset:flame'), false);
  assert.equal(isRemoteImageUrl('flame'), false);
  assert.equal(isRemoteImageUrl(null), false);

  assert.equal(isPresetAvatarKey('preset:flame'), true);
  assert.equal(isPresetAvatarKey('flame'), true);
  assert.equal(isPresetAvatarKey('https://google.com/pic.png'), false);
});
