# reg58.me

Personal site built with SvelteKit 3, hosted on Vercel:

- **Public portfolio**: `/` and `/projects`
- **Private smart home dashboard**: `/dashboard`, password-protected, controls devices through Home Assistant (or demo devices until that's set up)

## Quick start

```bash
npm install
npm run set-password   # creates .env with your password hash + session secret
npm run dev            # http://localhost:5173
```

Log in at `/login` (there is also a small "Login" link in the footer).

## Personalising

| What                     | Where                  |
| ------------------------ | ---------------------- |
| Name, tagline, about, links, email | `src/lib/site.ts`     |
| Projects                 | `src/lib/projects.ts`  |
| Colours / theme          | `src/app.css`          |
| Favicon                  | `src/lib/assets/favicon.svg` |

## How the private area is protected

- `src/hooks.server.ts` runs on every request. Anything under `/dashboard` or `/api/devices` without a valid session redirects to `/login` (pages) or returns `401` (API).
- The password is stored only as an **scrypt hash** in `.env` (`AUTH_PASSWORD_HASH`). Change it any time with `npm run set-password`.
- Sessions are HMAC-signed cookies (`HttpOnly`, `Secure`, `SameSite=Strict`, 30 days). Rotating `SESSION_SECRET` logs out every device.
- Login is limited to 5 failed attempts per IP per 15 minutes.

## Connecting real devices (Home Assistant)

1. Install [Home Assistant](https://www.home-assistant.io/installation/) on a Raspberry Pi, mini PC, or VM, and add your devices to it.
2. In Home Assistant: **Profile → Security → Long-lived access tokens → Create token**.
3. Add to `.env`:
   ```
   HA_URL=http://homeassistant.local:8123
   HA_TOKEN=<the token>
   ```
4. Restart. The dashboard now shows lights, switches, fans, thermostats, locks, covers, and key sensors, grouped by the **areas** you assign in Home Assistant.

The device code lives in `src/lib/server/devices/`. To support another platform, add a class implementing `DeviceProvider` there.

## Deploying to reg58.me (Vercel, free)

The site is hosted on [Vercel](https://vercel.com)'s free Hobby plan and redeploys automatically on every push to `main`.

### One-time setup

1. Sign up at vercel.com with your GitHub account.
2. **Add New → Project →** import this repo. Vercel detects SvelteKit; keep the defaults.
3. Before deploying, open **Environment Variables** and add the values from your local `.env`:
   - `AUTH_PASSWORD_HASH`
   - `SESSION_SECRET`
   - (later) `HA_URL`, `HA_TOKEN`
4. **Deploy.** You get a `*.vercel.app` URL to test.
5. **Settings → Domains →** add `reg58.me` (and `www.reg58.me`, set to redirect). Vercel shows DNS records — add them at your domain registrar (usually an `A` record for `@` and a `CNAME` for `www`). HTTPS is automatic once DNS updates.

To change your password later: run `npm run set-password` locally, copy the new `AUTH_PASSWORD_HASH` into Vercel's environment variables, and redeploy.

### Things to know about cloud hosting

- **Home Assistant must be reachable from the internet** for the dashboard to control real devices, since Vercel can't see your home network. Easiest options: [Home Assistant Cloud (Nabu Casa)](https://www.nabucasa.com/) gives you a public HTTPS URL, or run a Cloudflare Tunnel for Home Assistant only. Use that URL as `HA_URL`.
- **Demo devices reset** every so often, because serverless functions don't keep memory between cold starts. Real Home Assistant devices aren't affected.
- **Login rate-limiting is per server instance**, so it's softer than on a single server. Use a strong password, or add Vercel's firewall rules for `/login`.
- `npm run build` may fail on Windows with an `EPERM symlink` error at the very end. That's only local packaging; Vercel builds on Linux. Enable Windows Developer Mode if you want local builds to finish.

## Scripts

| Command                | Does                                  |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Dev server with hot reload            |
| `npm run check`        | Type-check                            |
| `npm run build`        | Production build (Vercel runs this)   |
| `npm run set-password` | Set/change the dashboard password     |
