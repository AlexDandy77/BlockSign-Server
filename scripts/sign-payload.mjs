// Usage: node scripts/sign-payload.mjs
  
import * as ed from '@noble/ed25519';

const privHex = "f34b22d549a5bf1792fe93a7b2a239716b288f9188166424f57f268bcdf39ff7"; // now alex dandy user
const payload = {
    sha256Hex: "00cf834bbb613215f65ab3ffc5f6f8d2ce9e3fda1045d50b3129c5f7a3743aa2",
    docTitle: "TestDoc",
    participantsUsernames: ["alexdandy","alexeydandy"],
};
const message = JSON.stringify(payload);

const privateKey = Buffer.from(privHex, 'hex');
const msgBytes   = Buffer.from(message, 'utf8');

const signature = await ed.signAsync(msgBytes, privateKey);

console.log('MESSAGE:', message);
console.log('SIGNATURE_B64:', Buffer.from(signature).toString('base64'));
