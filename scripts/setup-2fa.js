// Usage: npm run setup-2fa
// Creates a new two-factor secret, saves it to .env as TOTP_SECRET, and shows a QR code
// to scan with Google Authenticator (or any authenticator app, e.g. Proton Pass).
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import QRCode from 'qrcode';

function base32Encode(buffer) {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	let bits = 0;
	let value = 0;
	let output = '';
	for (const byte of buffer) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			bits -= 5;
			output += alphabet[(value >>> bits) & 31];
		}
		value &= (1 << bits) - 1;
	}
	if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
	return output;
}

let env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';

if (/^TOTP_SECRET=.+$/m.test(env)) {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const answer = await rl.question(
		'Two-factor is already set up. Replacing it means re-scanning in your app. Replace? (y/N) '
	);
	rl.close();
	if (answer.trim().toLowerCase() !== 'y') process.exit(0);
}

const secret = base32Encode(randomBytes(20)); // 160 bits, the size RFC 6238 recommends
const line = `TOTP_SECRET=${secret}`;
env = /^TOTP_SECRET=.*$/m.test(env)
	? env.replace(/^TOTP_SECRET=.*$/m, line)
	: `${env.trimEnd()}\n${line}\n`.trimStart();
writeFileSync('.env', env);

const uri = `otpauth://totp/reg58.me:owner?secret=${secret}&issuer=reg58.me&algorithm=SHA1&digits=6&period=30`;
console.log('\nScan this with Google Authenticator (+ → Scan a QR code):\n');
console.log(await QRCode.toString(uri, { type: 'terminal', small: true }));
console.log(`Can't scan? Choose "Enter a setup key" and type: ${secret}\n`);
console.log('Saved to .env as TOTP_SECRET. Restart the dev server to turn on two-factor login.');
console.log('For the live site, add the same TOTP_SECRET to Vercel and redeploy.\n');
