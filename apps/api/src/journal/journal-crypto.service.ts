import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export interface JournalPlaintext {
  date: string;
  title: string;
  description: string;
}

@Injectable()
export class JournalCryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const seed = config.get<string>('JOURNAL_ENCRYPTION_KEY');
    if (!seed) {
      throw new Error('JOURNAL_ENCRYPTION_KEY is not set. Add it to your .env file.');
    }
    this.key = createHash('sha256').update(seed).digest();
  }

  encrypt(data: JournalPlaintext): string {
    const plaintext = Buffer.from(JSON.stringify(data), 'utf-8');
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Layout: IV (12) + ciphertext (N) + authTag (16)
    const result = Buffer.concat([iv, encrypted, authTag]);
    return result.toString('base64');
  }

  decrypt(ciphertext: string): JournalPlaintext {
    const buf = Buffer.from(ciphertext, 'base64');

    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return JSON.parse(decrypted.toString('utf-8'));
  }
}
