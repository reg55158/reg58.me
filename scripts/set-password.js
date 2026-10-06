// Usage: npm run set-password
// Prompts for a password, then writes AUTH_PASSWORD_HASH (and SESSION_SECRET if missing) to .env.
import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

function ask(question) {
	return new Promise((resolve) => {
		const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
		rl._writeToOutput = (s) => rl.output.write(s.startsWith(question) ? s : '');
		rl.question(question, (answer) => {
			rl.close();
			process.stdout.write('\n');
			resolve(answer);
		});
	});
}

const password = await ask('New dashboard password: ');
if (!password) {
	console.error('Password cannot be empty.');
	process.exit(1);
}
if ((await ask('Repeat password: ')) !== password) {
	console.error('Passwords do not match.');
	process.exit(1);
}

const N = 16384, r = 8, p = 1;
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, { N, r, p });
const value = `scrypt:${N}:${r}:${p}:${salt.toString('base64url')}:${hash.toString('base64url')}`;

let env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
const set = (key, val) => {
	const line = `${key}=${val}`;
	env = new RegExp(`^${key}=.*$`, 'm').test(env)
		? env.replace(new RegExp(`^${key}=.*$`, 'm'), line)
		: `${env.trimEnd()}\n${line}\n`.trimStart();
};
set('AUTH_PASSWORD_HASH', value);
if (!/^SESSION_SECRET=.{32,}$/m.test(env)) set('SESSION_SECRET', randomBytes(32).toString('base64url'));
writeFileSync('.env', env);
console.log('Saved to .env. Restart the server to apply.');
