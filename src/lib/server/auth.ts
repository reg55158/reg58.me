import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Cookies } from '@sveltejs/kit';
import { AUTH_PASSWORD_HASH, SESSION_SECRET } from '$app/env/private';

const scryptAsync = promisify(scrypt) as (
	password: string,
	salt: Buffer,
	keylen: number,
	options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

export const SESSION_COOKIE = 'session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const authConfigured = Boolean(AUTH_PASSWORD_HASH && SESSION_SECRET);

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

function sign(payload: string): string {
	return createHmac('sha256', SESSION_SECRET!).update(payload).digest('base64url');
}

/** Stateless session token: `<expiry>.<nonce>.<hmac>` */
function createToken(): string {
	const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
	const payload = `${expires}.${randomBytes(16).toString('base64url')}`;
	return `${payload}.${sign(payload)}`;
}

export function isValidSession(token: string | undefined): boolean {
	if (!token || !authConfigured) return false;

	const lastDot = token.lastIndexOf('.');
	if (lastDot === -1) return false;

	const payload = token.slice(0, lastDot);
	const signature = Buffer.from(token.slice(lastDot + 1));
	const expected = Buffer.from(sign(payload));
	if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return false;

	const expires = Number(payload.split('.')[0]);
	return Number.isFinite(expires) && expires > Date.now() / 1000;
}

export function startSession(cookies: Cookies) {
	cookies.set(SESSION_COOKIE, createToken(), {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: true, // SvelteKit relaxes this automatically on http://localhost
		maxAge: SESSION_TTL_SECONDS
	});
}

export function endSession(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
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
