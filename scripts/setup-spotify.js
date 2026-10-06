// Usage: npm run setup-spotify
// One-time setup for the "now playing" panel:
//   1. asks for your Spotify app's Client ID and Secret (developer.spotify.com/dashboard)
//   2. opens Spotify in your browser so you can approve access to what you're listening to
//   3. saves SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SPOTIFY_REFRESH_TOKEN to .env
import { exec } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline/promises';

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
// Read-only: the current song and recently played songs. Nothing can be changed with this.
const SCOPES = 'user-read-currently-playing user-read-recently-played';

let env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
const read = (key) => env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim();
const save = (key, value) => {
	const line = `${key}=${value}`;
	env = new RegExp(`^${key}=.*$`, 'm').test(env)
		? env.replace(new RegExp(`^${key}=.*$`, 'm'), line)
		: `${env.trimEnd()}\n${line}\n`.trimStart();
	writeFileSync('.env', env);
};

const rl = createInterface({ input: process.stdin, output: process.stdout });
console.log(`\nIn your Spotify app's settings, the Redirect URI must be exactly: ${REDIRECT_URI}\n`);
const clientId = (await rl.question(`Client ID${read('SPOTIFY_CLIENT_ID') ? ' (Enter to keep current)' : ''}: `)).trim() || read('SPOTIFY_CLIENT_ID');
const clientSecret = (await rl.question(`Client Secret${read('SPOTIFY_CLIENT_SECRET') ? ' (Enter to keep current)' : ''}: `)).trim() || read('SPOTIFY_CLIENT_SECRET');
rl.close();
if (!clientId || !clientSecret) {
	console.error('Both the Client ID and Client Secret are needed.');
	process.exit(1);
}
save('SPOTIFY_CLIENT_ID', clientId);
save('SPOTIFY_CLIENT_SECRET', clientSecret);

// "state" makes sure the reply we receive is for the request we started.
const state = randomBytes(16).toString('hex');
const authorizeUrl =
	'https://accounts.spotify.com/authorize?' +
	new URLSearchParams({
		response_type: 'code',
		client_id: clientId,
		scope: SCOPES,
		redirect_uri: REDIRECT_URI,
		state
	});

// A tiny one-off web server on your own computer that catches Spotify's reply.
const server = createServer(async (req, res) => {
	const url = new URL(req.url, REDIRECT_URI);
	if (url.pathname !== '/callback') return res.writeHead(404).end();

	const finish = (message, ok) => {
		res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/html; charset=utf-8' });
		res.end(`<body style="font-family:sans-serif;padding:40px"><h2>${message}</h2><p>You can close this tab.</p></body>`);
		console.log(`\n${message}`);
		server.close();
		process.exitCode = ok ? 0 : 1;
	};

	if (url.searchParams.get('state') !== state) return finish('Something went wrong (state mismatch). Run the setup again.', false);
	if (url.searchParams.get('error')) return finish(`Spotify said: ${url.searchParams.get('error')}`, false);

	const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code: url.searchParams.get('code') ?? '',
			redirect_uri: REDIRECT_URI
		})
	});
	const data = await tokenRes.json();
	if (!tokenRes.ok || !data.refresh_token) {
		return finish(`Couldn't get a token: ${data.error_description ?? data.error ?? tokenRes.status}`, false);
	}

	save('SPOTIFY_REFRESH_TOKEN', data.refresh_token);
	finish('Spotify is connected. Saved to .env; restart the dev server to see the panel.', true);
});

server.listen(PORT, '127.0.0.1', () => {
	console.log('\nOpening Spotify in your browser to approve access...');
	console.log(`If it doesn't open, copy this link into your browser:\n\n${authorizeUrl}\n`);
	const opener =
		process.platform === 'win32' ? `start "" "${authorizeUrl}"` : process.platform === 'darwin' ? `open "${authorizeUrl}"` : `xdg-open "${authorizeUrl}"`;
	exec(opener);
});
