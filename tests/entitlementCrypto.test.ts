import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeLocalTamperSignature,
  verifyLocalTamperSignature,
} from '../src/features/subscription/entitlementCrypto.ts';

test('entitlement anti-tamper cryptographic signatures', async (t) => {
  const userId = 'user_abc_123';
  const status = 'premium';
  const expiresAt = 1790000000000;

  await t.test('computes a consistent signature and verifies successfully', () => {
    const sig = computeLocalTamperSignature(userId, status, expiresAt);
    assert.equal(typeof sig, 'string');
    assert.equal(sig.length > 20, true);

    const valid = verifyLocalTamperSignature(userId, status, expiresAt, sig);
    assert.equal(valid, true);
  });

  await t.test('fails verification if user ID is altered', () => {
    const sig = computeLocalTamperSignature(userId, status, expiresAt);
    const valid = verifyLocalTamperSignature('attacker_user_id', status, expiresAt, sig);
    assert.equal(valid, false);
  });

  await t.test('fails verification if status is altered from free to premium', () => {
    const sig = computeLocalTamperSignature(userId, 'free', null);
    const valid = verifyLocalTamperSignature(userId, 'premium', expiresAt, sig);
    assert.equal(valid, false);
  });

  await t.test('fails verification if expiration date is extended into the future', () => {
    const originalExpiry = 1750000000000;
    const sig = computeLocalTamperSignature(userId, status, originalExpiry);
    const valid = verifyLocalTamperSignature(userId, status, originalExpiry + 100000000, sig);
    assert.equal(valid, false);
  });

  await t.test('fails verification if signature is malformed or missing', () => {
    assert.equal(verifyLocalTamperSignature(userId, status, expiresAt, null), false);
    assert.equal(verifyLocalTamperSignature(userId, status, expiresAt, ''), false);
    assert.equal(verifyLocalTamperSignature(userId, status, expiresAt, 'invalid_sig'), false);
  });
});
