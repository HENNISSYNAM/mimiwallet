// One-time bootstrap: generates the server's ML-KEM-768 keypair used to
// encrypt sensitive KYC fields (see supabase/functions/_shared/pqcCrypto.ts).
//
// Run once with Deno:
//   deno run scripts/generate-pqc-keypair.ts
//
// Then store the printed values as Supabase Edge Function secrets:
//   supabase secrets set PQC_KYC_PUBLIC_KEY=<publicKey> PQC_KYC_PRIVATE_KEY=<privateKey>
//
// The private key must never be committed to the repo or logged anywhere
// other than this one-time terminal output. Losing it makes any previously
// encrypted KYC data unrecoverable; rotating it requires re-encrypting
// existing rows (out of scope for this bootstrap script).

import { ml_kem768 } from "https://esm.sh/@noble/post-quantum@0.6.1/ml-kem.js";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

const { publicKey, secretKey } = ml_kem768.keygen();

console.log("ML-KEM-768 keypair generated.\n");
console.log("PQC_KYC_PUBLIC_KEY=" + toBase64(publicKey));
console.log("PQC_KYC_PRIVATE_KEY=" + toBase64(secretKey));
console.log(
  "\nStore both as Supabase Edge Function secrets (never commit the private key):\n" +
    "  supabase secrets set PQC_KYC_PUBLIC_KEY=... PQC_KYC_PRIVATE_KEY=..."
);
