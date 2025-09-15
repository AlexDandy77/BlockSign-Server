// Usage: node scripts/verify.mjs <PUBLIC_KEY_HEX> "message-to-verify" <SIGNATURE_B64>

import * as ed from '@noble/ed25519';

if (process.argv.length < 5) {
  console.error('Usage: node verify.mjs <PUBLIC_KEY_HEX> "message-to-verify" <SIGNATURE_B64>');
  process.exit(1);
}

const pubHex   = process.argv[2];
const message  = process.argv[3];
const sigB64   = process.argv[4];

const publicKey = Buffer.from(pubHex, 'hex');
const msgBytes  = Buffer.from(message, 'utf8');
const signature = Buffer.from(sigB64, 'base64');

const ok = await ed.verifyAsync(signature, msgBytes, publicKey);

console.log('MESSAGE:', message);
console.log('SIGNATURE_B64:', sigB64);
console.log('VALID?', ok);
