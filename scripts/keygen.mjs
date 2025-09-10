// keygen.mjs (ESM)
// Usage:
//   node keygen.mjs

import * as ed from '@noble/ed25519';

const privateKey = ed.utils.randomSecretKey();        // Uint8Array(32)
const publicKey  = await ed.getPublicKeyAsync(privateKey); // Uint8Array(32)

const privHex = Buffer.from(privateKey).toString('hex');
const pubHex  = Buffer.from(publicKey).toString('hex');

console.log('PUBLIC_KEY_HEX:', pubHex);
console.log('PRIVATE_KEY_HEX (SAVE SECURELY):', privHex);