import { ConfigService } from '@nestjs/config';
import { JournalCryptoService, JournalPlaintext } from './journal-crypto.service';

function makeService(key = 'test-encryption-key-for-ci'): JournalCryptoService {
  const config = {
    get: (k: string) => (k === 'JOURNAL_ENCRYPTION_KEY' ? key : undefined),
  } as ConfigService;
  return new JournalCryptoService(config);
}

describe('JournalCryptoService', () => {
  const entry: JournalPlaintext = {
    date: '2026-02-18',
    title: 'Test entry',
    description: 'This is a test journal entry for CI.',
  };

  it('encrypt then decrypt returns original data', () => {
    const svc = makeService();
    const ciphertext = svc.encrypt(entry);
    const decrypted = svc.decrypt(ciphertext);

    expect(decrypted).toEqual(entry);
  });

  it('rejects tampered ciphertext', () => {
    const svc = makeService();
    const ciphertext = svc.encrypt(entry);

    const buf = Buffer.from(ciphertext, 'base64');
    buf[20] ^= 0xff;
    const tampered = buf.toString('base64');

    expect(() => svc.decrypt(tampered)).toThrow();
  });

  it('produces unique ciphertext for the same plaintext (random IV)', () => {
    const svc = makeService();
    const a = svc.encrypt(entry);
    const b = svc.encrypt(entry);

    expect(a).not.toBe(b);
  });
});
