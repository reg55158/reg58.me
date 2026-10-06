import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Cookies } from '@sveltejs/kit';
import { AUTH_PASSWORD_HASH, SESSION_SECRET, TOTP_SECRET } from '$app/env/private';

const scryptAsync = promisify(scrypt) as (
	password: string,
	salt: Buffer,
	keylen: number,
	options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

export const SESSION_COOKIE = 'session';
const PENDING_COOKIE = 'login_pending';
const DEVICE_COOKIE = 'trusted_device';

const DAY = 60 * 60 * 24;
const SESSION_TTL_SECONDS = 30 * DAY;
const PENDING_TTL_SECONDS = 5 * 60; // time allowed between entering the password and the code
const DEVICE_TTL_SECONDS = 30 * DAY; // "Remember this device for 30 days"

export const authConfigured = Boolean(AUTH_PASSWORD_HASH && SESSION_SECRET);
/** Two-factor codes are required once a TOTP secret is set (`npm run setup-2fa`). */
export const twoFactorEnabled = Boolean(TOTP_SECRET);

/**
 * Hash format: scrypt:N:r:p:<salt base64url>:<hash base64url>
 * (colon-separated so it survives .env variable expansion, which treats `$` specially)
 */
export async function verifyPassword(password: string): Promise<boolean> {
	if (!AUTH_PASSWORD_HASH) return false;

	const [algo, n, r, p, saltB64, hashB64] = AUTH_PASSWORD_HASH.split(':');
	if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;

	const expected = Buffer.from(hashB64, 'base64url');
	const N = Number(n);
	const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64url'), expected.length, {
		N,
		r: Number(r),
		p: Number(p),
		maxmem: 256 * N * Number(r)
	});

	return timingSafeEqual(actual, expected);
}

/*
 * Signed tokens: `<expiry>.<nonce>.<hmac>`. The HMAC also covers a purpose ("session",
 * "pending", "device"), so a token issued for one purpose can never be used as another,
 * e.g. a "trusted device" cookie can't be copied into the session cookie.
 */
type Purpose = 'session' | 'pending' | 'device';

function sign(purpose: Purpose, payload: string): string {
	return createHmac('sha256', SESSION_SECRET!).update(`${purpose}|${payload}`).digest('base64url');
}

function createToken(purpose: Purpose, ttlSeconds: number): string {
	const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
	const payload = `${expires}.${randomBytes(16).toString('base64url')}`;
	return `${payload}.${sign(purpose, payload)}`;
}

function verifyToken(purpose: Purpose, token: string | undefined): boolean {
	if (!token || !authConfigured) return false;

	const lastDot = token.lastIndexOf('.');
	if (lastDot === -1) return false;

	const payload = token.slice(0, lastDot);
	const signature = Buffer.from(token.slice(lastDot + 1));
	const expected = Buffer.from(sign(purpose, payload));
	if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return false;

	const expires = Number(payload.split('.')[0]);
	return Number.isFinite(expires) && expires > Date.now() / 1000;
}

function setTokenCookie(cookies: Cookies, name: string, purpose: Purpose, ttlSeconds: number) {
	cookies.set(name, createToken(purpose, ttlSeconds), {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: true, // SvelteKit relaxes this automatically on http://localhost
		maxAge: ttlSeconds
	});
}

// Session: you're logged in.
export const isValidSession = (token: string | undefined) => verifyToken('session', token);
export const startSession = (cookies: Cookies) =>
	setTokenCookie(cookies, SESSION_COOKIE, 'session', SESSION_TTL_SECONDS);
export const endSession = (cookies: Cookies) => cookies.delete(SESSION_COOKIE, { path: '/' });

// Pending login: the password was right, now waiting for the 6-digit code.
export const startPendingLogin = (cookies: Cookies) =>
	setTokenCookie(cookies, PENDING_COOKIE, 'pending', PENDING_TTL_SECONDS);
export const hasPendingLogin = (cookies: Cookies) =>
	verifyToken('pending', cookies.get(PENDING_COOKIE));
export const clearPendingLogin = (cookies: Cookies) =>
	cookies.delete(PENDING_COOKIE, { path: '/' });

// Trusted device: this browser can skip the code for 30 days. Logging out keeps it.
export const rememberDevice = (cookies: Cookies) =>
	setTokenCookie(cookies, DEVICE_COOKIE, 'device', DEVICE_TTL_SECONDS);
export const isTrustedDevice = (cookies: Cookies) =>
	verifyToken('device', cookies.get(DEVICE_COOKIE));

/*
 * Time-based one-time passwords (RFC 6238), the 6-digit codes from Google Authenticator.
 * The app and server share a secret; every 30 seconds both compute
 * HMAC-SHA1(secret, current 30-second step) and turn it into 6 digits.
 */
function base32Decode(input: string): Buffer {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	const bytes: number[] = [];
	let bits = 0;
	let value = 0;
	for (const char of input.toUpperCase().replace(/[\s=]/g, '')) {
		const index = alphabet.indexOf(char);
		if (index === -1) throw new Error('TOTP_SECRET is not valid base32');
		value = (value << 5) | index;
		bits += 5;
		if (bits >= 8) {
			bits -= 8;
			bytes.push((value >>> bits) & 0xff);
			value &= (1 << bits) - 1; // keep only the bits not yet used
		}
	}
	return Buffer.from(bytes);
}

function codeForStep(key: Buffer, step: number): string {
	const counter = Buffer.alloc(8);
	counter.writeBigUInt64BE(BigInt(step));
	const hmac = createHmac('sha1', key).update(counter).digest();
	// "Dynamic truncation": the last nibble picks which 4 bytes become the code.
	const offset = hmac[hmac.length - 1] & 0x0f;
	const number = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
	return String(number).padStart(6, '0');
}

// The newest step a code has been accepted for, so each code can only be used once.
let lastUsedStep = -1;

export function verifyTotp(code: string): boolean {
	if (!TOTP_SECRET || !/^\d{6}$/.test(code)) return false;
	const key = base32Decode(TOTP_SECRET);
	const step = Math.floor(Date.now() / 30_000);
	// Accept the previous and next code too, in case the phone's clock is slightly off.
	for (const candidate of [step - 1, step, step + 1]) {
		if (candidate <= lastUsedStep) continue;
		if (timingSafeEqual(Buffer.from(codeForStep(key, candidate)), Buffer.from(code))) {
			lastUsedStep = candidate;
			return true;
		}
	}
	return false;
}

// Simple in-memory brute-force protection: 5 failed attempts per IP per 15 minutes.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(ip: string): boolean {
	const entry = attempts.get(ip);
	if (!entry) return false;
	if (entry.resetAt < Date.now()) {
		attempts.delete(ip);
		return false;
	}
	return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(ip: string) {
	const entry = attempts.get(ip);
	if (!entry || entry.resetAt < Date.now()) {
		attempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
	} else {
		entry.count++;
	}
}

export function clearAttempts(ip: string) {
	attempts.delete(ip);
}
