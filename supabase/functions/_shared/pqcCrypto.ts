// Post-quantum hybrid encryption for sensitive fields (KYC PII, etc).
//
// KEM+DEM hybrid pattern: ML-KEM-768 (FIPS 203, quantum-resistant lattice KEM)
// encapsulates a per-record shared secret; HKDF-SHA256 derives an AES-256-GCM
// key from it; AES-GCM encrypts the actual plaintext. ML-KEM itself can't
// encrypt arbitrary-length data, hence the AES layer.
//
// The server keypair is provisioned once via scripts/generate-pqc-keypair.ts
// and stored as Supabase Edge Function secrets (PQC_KYC_PUBLIC_KEY /
// PQC_KYC_PRIVATE_KEY) — never committed to the repo.

import { ml_kem768 } from "https://esm.sh/@noble/post-quantum@0.6.1/ml-kem.js";
import { hkdf } from "https://esm.sh/@noble/hashes@1.5.0/hkdf.js";
import { sha256 } from "https://esm.sh/@noble/hashes@1.5.0/sha256.js";

export interface EncryptedBlob {
  v: 1;
  kemCipherText: string; // base64
  iv: string; // base64
  aesCipherText: string; // base64 (includes GCM auth tag)
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/*
 * The `as BufferSource` casts below are not papering over a bug.
 *
 * Since TypeScript 5.7 `Uint8Array` is generic over its backing buffer, and
 * WebCrypto's signatures demand `ArrayBufferView<ArrayBuffer>`. An array whose
 * type says `ArrayBufferLike` might in theory be backed by a SharedArrayBuffer,
 * which WebCrypto rejects — but these come from `hkdf` and from base64 decoding,
 * neither of which can produce one. The runtime behaviour has never been in
 * question; only the type is.
 *
 * They are here so `deno check` passes clean, because a check with two known
 * failures is a check nobody reads.
 */
async function deriveAesKey(sharedSecret: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = hkdf(sha256, sharedSecret, undefined, "mimiwallet-pqc-kyc-v1", 32);
  return crypto.subtle.importKey("raw", keyMaterial as unknown as BufferSource, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptField(
  plaintext: string,
  publicKeyB64: string
): Promise<EncryptedBlob> {
  const publicKey = fromBase64(publicKeyB64);
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKey);
  const aesKey = await deriveAesKey(sharedSecret);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const aesCipherText = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded)
  );

  return {
    v: 1,
    kemCipherText: toBase64(cipherText),
    iv: toBase64(iv),
    aesCipherText: toBase64(aesCipherText),
  };
}

export async function decryptField(
  blob: EncryptedBlob,
  privateKeyB64: string
): Promise<string> {
  const privateKey = fromBase64(privateKeyB64);
  const kemCipherText = fromBase64(blob.kemCipherText);
  const sharedSecret = ml_kem768.decapsulate(kemCipherText, privateKey);
  const aesKey = await deriveAesKey(sharedSecret);

  const iv = fromBase64(blob.iv);
  const aesCipherText = fromBase64(blob.aesCipherText);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    aesKey,
    aesCipherText as unknown as BufferSource,
  );
  return new TextDecoder().decode(decrypted);
}

export async function encryptJson(
  value: unknown,
  publicKeyB64: string
): Promise<EncryptedBlob> {
  return encryptField(JSON.stringify(value), publicKeyB64);
}

export async function decryptJson<T = unknown>(
  blob: EncryptedBlob,
  privateKeyB64: string
): Promise<T> {
  return JSON.parse(await decryptField(blob, privateKeyB64)) as T;
}
