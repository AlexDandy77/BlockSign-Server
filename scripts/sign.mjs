// Usage: node scripts/sign.mjs <PRIVATE_KEY_HEX> "message-to-sign"

import * as ed from '@noble/ed25519';

if (process.argv.length < 4) {
    console.error('Usage: node sign.mjs <PRIVATE_KEY_HEX> "message-to-sign"');
    process.exit(1);
}

const privHex = process.argv[2];
const message = process.argv[3];

const privateKey = Buffer.from(privHex, 'hex');
const msgBytes = Buffer.from(message, 'utf8');

const signature = await ed.signAsync(msgBytes, privateKey);

console.log('MESSAGE:', message);
console.log('SIGNATURE_B64:', Buffer.from(signature).toString('base64'));
