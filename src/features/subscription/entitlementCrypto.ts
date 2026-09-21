export const SERVER_ENTITLEMENT_SECRET = 'lamplight-entitlement-secret-2026-server-internal';

function sha256(ascii: string): Uint8Array {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0, j = 0;

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength | 0;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];

      const s0 =
        ((w15 >>> 7) | (w15 << 25)) ^
        ((w15 >>> 18) | (w15 << 14)) ^
        (w15 >>> 3);
      const s1 =
        ((w2 >>> 17) | (w2 << 15)) ^
        ((w2 >>> 19) | (w2 << 13)) ^
        (w2 >>> 10);

      w[i] =
        i < 16
          ? w[i]
          : (w[i - 16] + s0 + w[i - 7] + s1) | 0;

      const s1h =
        ((hash[4] >>> 6) | (hash[4] << 26)) ^
        ((hash[4] >>> 11) | (hash[4] << 21)) ^
        ((hash[4] >>> 25) | (hash[4] << 7));
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1h + ch + k[i] + w[i]) | 0;

      const s0h =
        ((hash[0] >>> 2) | (hash[0] << 30)) ^
        ((hash[0] >>> 13) | (hash[0] << 19)) ^
        ((hash[0] >>> 22) | (hash[0] << 10));
      const maj =
        (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0h + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  const out = new Uint8Array(32);
  for (i = 0; i < 8; i++) {
    out[i * 4] = (hash[i] >>> 24) & 255;
    out[i * 4 + 1] = (hash[i] >>> 16) & 255;
    out[i * 4 + 2] = (hash[i] >>> 8) & 255;
    out[i * 4 + 3] = hash[i] & 255;
  }
  return out;
}

export function hmacSha256(message: string, key: string): string {
  const blockSize = 64;
  let keyBytes: Uint8Array<ArrayBufferLike> = new Uint8Array(key.length);
  for (let i = 0; i < key.length; i++) keyBytes[i] = key.charCodeAt(i) & 255;

  if (keyBytes.length > blockSize) {
    keyBytes = sha256(key);
  }

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    const k = i < keyBytes.length ? keyBytes[i] : 0;
    oKeyPad[i] = k ^ 0x5c;
    iKeyPad[i] = k ^ 0x36;
  }

  const innerStr = String.fromCharCode(...iKeyPad) + message;
  const innerHash = sha256(innerStr);

  const outerStr = String.fromCharCode(...oKeyPad) + String.fromCharCode(...innerHash);
  const outerHash = sha256(outerStr);

  let hex = '';
  for (let i = 0; i < outerHash.length; i++) {
    hex += outerHash[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function computeEntitlementSignature(
  userId: string,
  status: string,
  expiresAt: number | null,
  secret: string = SERVER_ENTITLEMENT_SECRET,
): string {
  const payload = `${userId}:${status}:${expiresAt ? Math.round(expiresAt) : 'never'}`;
  return hmacSha256(payload, secret);
}

export function verifyEntitlementSignature(
  userId: string | null | undefined,
  status: string,
  expiresAt: number | null,
  signature: string | null | undefined,
  secret: string = SERVER_ENTITLEMENT_SECRET,
): boolean {
  if (!signature || !userId) return false;
  const expected = computeEntitlementSignature(userId, status, expiresAt, secret);
  return expected.toLowerCase() === signature.toLowerCase();
}
