/**
 * @jest-environment node
 */
import { deriveKey, encryptEntry, decryptEntry, estimateBytes, JournalEntry } from '../crypto';

const FAKE_SIGNATURE =
  '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd' as `0x${string}`;

const entry: JournalEntry = {
  date: '2026-02-18',
  title: 'Test entry',
  description: 'Testing encryption in CI.',
};

describe('crypto', () => {
  describe('deriveKey', () => {
    it('returns a 32-byte Uint8Array from a hex signature', () => {
      const key = deriveKey(FAKE_SIGNATURE);
      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32);
    });
  });

  describe('encryptEntry / decryptEntry', () => {
    it('round-trip: decrypt(encrypt(entry)) returns original entry', () => {
      const key = deriveKey(FAKE_SIGNATURE);
      const encrypted = encryptEntry(key, entry);
      const decrypted = decryptEntry(key, encrypted);

      expect(decrypted).toEqual(entry);
    });
  });

  describe('estimateBytes', () => {
    it('returns IV + JSON length + auth tag size', () => {
      const jsonBytes = new TextEncoder().encode(JSON.stringify(entry)).length;
      const expected = 12 + jsonBytes + 16;

      expect(estimateBytes(entry)).toBe(expected);
    });
  });
});
