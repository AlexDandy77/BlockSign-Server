import * as ed from '@noble/ed25519';
import { sha3_512 } from '@noble/hashes/sha3.js';

ed.hashes.sha512 = sha3_512;

export { ed };
