// Usage: node scripts/mnemonic-to-priv-key.mjs

import { mnemonicToSeedSync } from '@scure/bip39';
import { derivePath } from 'ed25519-hd-key';

const mnemonic = ''; // introduce your 12/24-word mnemonic here
const passphrase = ''; // optional user-provided extra password (BIP-39 optional)

const seed = mnemonicToSeedSync(mnemonic, passphrase); // Buffer/Uint8Array

const PATH = "m/44'/53550'/0'/0'/0'"; // BlockSign path (document this)
const { key: privateKey } = derivePath(PATH, Buffer.from(seed).toString('hex')); // 32-byte private key

const privHex = Buffer.from(privateKey).toString('hex');
console.log('PRIVATE_KEY_HEX (SAVE SECURELY):', privHex);