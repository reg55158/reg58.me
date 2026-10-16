# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Public visitors:** mostly friends and fellow developers who want to see what Reg is building. There is no sales or hiring funnel; a visit succeeds when they look through the projects and come away knowing what Reg makes.
- **Owner (Reg):** the only person who can sign in. Uses the private smart home dashboard on a phone around the house, on a phone away from home (checking locks, temperatures, what's still on), and at a desktop or laptop.

## Product Purpose

reg58.me is Reg's personal site, with two parts:

1. **Portfolio:** shows Reg's projects, pulled live from public GitHub repos, plus an intro, about, toolbox and contact.
2. **Smart home dashboard** (`/dashboard`, owner only): controls the house through Home Assistant. It must be quick to read and act on from a phone, in the house or out.

## Positioning

A personal space, not a marketing site. The projects are real repos pulled from GitHub. The site sits next to a sister site, F1 Tools (f1.reg58.me), linked by a "Reg | F1" switch that remembers your place on each.

## Operating Context

- **Projects:** come from the GitHub account `reg55158`. Forks are skipped, the `portfolio` topic selects which repos appear, and the `complete` topic marks finished ones. Extra cards (for example private repos) live in `src/lib/projects.ts`.
- **Now playing:** a panel beside the intro shows what Reg is listening to on Spotify, or the last song played.
- **Dashboard devices:** lights (some dimmable), switches, fans, thermostats, locks, blinds/covers and sensors, grouped by Home Assistant room. State refreshes every 10 seconds. Some devices can be offline. Without Home Assistant configured, the dashboard shows demo devices.
- **Sign-in:** password plus an optional 6-digit authenticator code, with "remember this device for 30 days".

## Capabilities and Constraints

- Built with SvelteKit and Svelte 5 in TypeScript, hosted on Vercel. There is no database: sessions are signed cookies and configuration lives in environment variables.
- Device commands available: turn on/off, set brightness (0–100), set target temperature, lock/unlock, open/close. Thermostats may use °C or °F.
- Home Assistant and GitHub tokens are server-only and must never reach the browser.
- `SiteSwitch.svelte` is shared with the f1-tools repo and must stay in sync with it.

## Brand Commitments

- Name: "Reg". Tagline: "Building cool stuff, one lap at a time."
- Voice: first person, friendly and casual.
- The current Gulf-livery racing look (blue, orange and navy, livery stripes, race-number project cards, an F1 car on the scroll stripe) exists, but the owner says it is **open to change**. It is not a binding commitment. The motorsport link to F1 Tools is part of the site's personality.

## Evidence on Hand

- Real project data from GitHub, and real device state from Home Assistant (or demo devices).
- Favicon: `src/lib/assets/favicon.svg`.
- No testimonials, client logos, stats or press. Future work must not invent any.

## Product Principles

1. **Personal over promotional.** The site is for people who know or follow Reg, so show the work honestly rather than selling it.
2. **The dashboard is a tool first.** Its state must read at a glance and its controls must be one tap on a phone, including away from home.
3. **Live, not static.** Projects, music and device state come from real sources. Show what is true right now, including offline and empty states.
4. **Private stays private.** The owner-only side never leaks tokens, device details or controls to visitors.

## Accessibility & Inclusion

No product-specific requirement has been set. Reduced motion is already respected site-wide.
