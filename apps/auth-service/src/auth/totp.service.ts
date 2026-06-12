import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';

// RFC 6238 TOTP implemented from scratch using Node.js built-in crypto.
// No external library — you can see exactly what Google Authenticator does.
//
// The algorithm:
//   1. counter = floor(Date.now() / 1000 / 30)   ← 30-second window
//   2. key     = base32Decode(secret)             ← shared secret, stored on the user
//   3. hmac    = HMAC-SHA1(key, counter_as_8_bytes_big_endian)
//   4. offset  = hmac[19] & 0x0f                  ← last nibble of hash
//   5. code    = (read 4 bytes at offset, mask high bit) % 1_000_000

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(bytes: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

function base32Decode(encoded: string): Buffer {
  const clean = encoded.toUpperCase().replace(/=+$/, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function computeTotp(secret: string, windowOffset = 0): string {
  const counter = Math.floor(Date.now() / 1000 / 30) + windowOffset;

  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter));

  const key = base32Decode(secret);
  const hmac = createHmac('sha1', key).update(counterBuf).digest();

  const offset = hmac[19] & 0x0f;
  const otp = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;

  return otp.toString().padStart(6, '0');
}

@Injectable()
export class TotpService {
  generateSecret(email: string): { secret: string; uri: string } {
    const secret = base32Encode(randomBytes(20));
    const uri = this.buildUri(email, 'Ecommerce', secret);
    return { secret, uri };
  }

  verify(token: string, secret: string): boolean {
    for (const offset of [-1, 0, 1]) {
      if (computeTotp(secret, offset) === token) return true;
    }
    return false;
  }

  private buildUri(account: string, issuer: string, secret: string): string {
    const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
    return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  }
}
