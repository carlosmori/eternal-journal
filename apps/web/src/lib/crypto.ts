import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/ciphers/webcrypto';
import { sha256 } from '@noble/hashes/sha256';
import { hexToBytes } from 'viem';

// Deterministic message for deriving encryption key.
// Includes domain and version to avoid collisions and allow versioning.
export const SIGN_MESSAGE = 'Eternal Journal encryption key | base-mainnet | v1';

const IV_LENGTH = 12; // 96 bits, recommended for AES-GCM

export interface JournalEntry {
  date: string;
  title: string;
  description: string;
}

/**
 * Derives an AES-256 key from the wallet signature.
 * @param signature Hex string (0x...) returned by signMessage
 * @returns Uint8Array of 32 bytes (256 bits)
 */
export function deriveKey(signature: `0x${string}`): Uint8Array {
  const sigBytes = hexToBytes(signature);
  return sha256(sigBytes);
}

/**
 * Encrypts a journal entry with AES-256-GCM.
 * @returns Uint8Array with [IV (12 bytes) | ciphertext + authTag]
 */
export function encryptEntry(key: Uint8Array, entry: JournalEntry): Uint8Array {
  const plaintext = new TextEncoder().encode(JSON.stringify(entry));
  const iv = randomBytes(IV_LENGTH);
  const cipher = gcm(key, iv);
  const ciphertext = cipher.encrypt(plaintext);

  // Prepend IV to ciphertext for decryption later
  const result = new Uint8Array(IV_LENGTH + ciphertext.length);
  result.set(iv, 0);
  result.set(ciphertext, IV_LENGTH);
  return result;
}

/**
 * Decrypts a journal entry.
 * @param data Uint8Array with [IV (12 bytes) | ciphertext + authTag]
 * @returns JournalEntry parsed from decrypted JSON
 */
export function decryptEntry(key: Uint8Array, data: Uint8Array): JournalEntry {
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);
  const cipher = gcm(key, iv);
  const plaintext = cipher.decrypt(ciphertext);
  const text = new TextDecoder().decode(plaintext);
  return JSON.parse(text);
}

/**
 * Estimates the ciphertext size in bytes for an entry.
 * Useful to show the user before submitting.
 * Overhead: 12 (IV) + 16 (auth tag) + JSON length in UTF-8
 */
export function estimateBytes(entry: JournalEntry): number {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(entry)).length;
  return IV_LENGTH + jsonBytes + 16; // 16 bytes auth tag
}

export const MAX_ENTRY_BYTES = 1024;
