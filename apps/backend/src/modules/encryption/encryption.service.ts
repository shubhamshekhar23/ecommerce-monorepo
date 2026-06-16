import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_VERSION = '1';

/*
 - Encrypts/decrypts PII fields using AES-256-GCM.
 - Ciphertext format: {version}:{iv_hex}:{authTag_hex}:{data_hex}
 - The version prefix enables key rotation without a schema change.
 - Disabled (pass-through) when DB_ENCRYPTION_KEY is absent or invalid.
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer | null;

  constructor() {
    const hex = process.env.DB_ENCRYPTION_KEY ?? '';
    const buf = Buffer.from(hex, 'hex');
    if (buf.length === 32) {
      this.key = buf;
    } else {
      this.logger.warn('DB_ENCRYPTION_KEY not set or invalid — field encryption disabled');
      this.key = null;
    }
  }

  get isEnabled(): boolean {
    return this.key !== null;
  }

  encrypt(plaintext: string): string {
    if (!this.key) return plaintext;
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${KEY_VERSION}:${iv.toString('hex')}:${tag.toString('hex')}:${data.toString('hex')}`;
  }

  decrypt(ciphertext: string): string {
    if (!this.key) return ciphertext;
    const [, ivHex, tagHex, dataHex] = ciphertext.split(':');
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString(
      'utf8',
    );
  }

  isEncrypted(value: string): boolean {
    const parts = value.split(':');
    return parts.length === 4 && /^\d+$/.test(parts[0]);
  }
}
