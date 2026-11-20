# Dev server: PR previews on Hetzner (Dokploy) — RAZ-886

Production stays on Vercel, which builds only `main` (`vercel.json` `ignoreCommand`).
Every PR gets a preview at **`https://pr-<n>.dev.wedance.vip`** on our Hetzner box instead.

## How a preview happens

1. `.github/workflows/preview.yml` (on every PR push, same-repo branches only) builds `Dockerfile`
   on GitHub's runner and pushes `ghcr.io/razbakov/wedance-2026:pr-<n>-<sha>`.
2. It SSHes to the box as `deploy` with a key whose forced command (`wedance-preview-ssh`) only allows
   `up <pr> <image>` / `down <pr>`.
3. `wedance-preview up` (on the box) clones database `pr_<n>` from `wedance_seed`, creates/updates the
   Dokploy compose `pr-<n>` (project **wedance-previews**: the app + the Neon-HTTP stand-in
   `scripts/dev/neon-http-proxy.ts`), deploys it and waits until the URL answers. The app's start
   command applies the branch's migrations to `pr_<n>` first. The PR gets a "Preview:" comment.
4. Closing the PR runs `down`: compose, database and the PR's images (box + ghcr) are removed.

At most `max_previews` (5) at once; a new PR removes the oldest preview. Each preview has a
768 MB memory limit.

## Data

`wedance_seed` = a copy of production, refreshed nightly at 03:30 UTC by `/etc/cron.d/wedance-preview`
(`wedance-preview seed`, read-only `pg_dump` — the production URL is in `/etc/wedance-preview/prod.url`,
root only). Left out: sessions, OAuth codes/tokens, Instagram tokens and webhooks. Every dancer's email,
phone and password is scrubbed, so nobody can sign in as a real person — sign up with a new account
(password sign-up works; FirebaseScrypt uses the e2e test keys). No Resend key: emails are only logged,
nobody is ever mailed from a preview. Previews never touch production.

## The box

`46.225.218.172` (Hetzner CX22-class, 2 vCPU / 4 GB + 4 GB swap, Ubuntu 24.04). Dokploy (Docker Swarm,
Traefik on 80/443) runs:

- **brievcase** — Brievcase production (`mission.razbakov.com`, behind Cloudflare; Traefik serves the
  Cloudflare origin certificate from `/etc/dokploy/traefik/dynamic/brievcase-cert.yml`). Its data volumes
  are the old `cwp_pgdata` / `cwp_repos`. Its GitHub deploy calls
  `wedance-preview deploy-compose <composeId> IMAGE_TAG=<tag>`.
- **wedance-previews** — `preview-db` (Postgres 17, container `wedance-preview-db`) and the `pr-<n>`
  composes.

Service names must be unique across stacks (`brievcase-db`, `wedance-preview-db`, `pr-<n>-app`): they
all share `dokploy-network`, where a plain `db` / `app` resolves to someone else's container.

Dokploy's panel listens on :3000, which the Hetzner firewall keeps closed — open it through SSH:
`ssh -L 3000:127.0.0.1:3000 root@46.225.218.172`, then http://localhost:3000.
Login + API key: `~/Secrets/dokploy-hetzner.txt` (on Alex's Mac).

## Files here → on the box

| Repo | Box |
|---|---|
| `wedance-preview` | `/usr/local/bin/wedance-preview` |
| `wedance-preview-ssh` | `/usr/local/bin/wedance-preview-ssh` (forced command in `~deploy/.ssh/authorized_keys`) |
| `wedance-preview.cron` | `/etc/cron.d/wedance-preview` |
| — | `/etc/wedance-preview/config.json`, `app.env` (root:deploy 0640), `prod.url` (root 0600) |

Change a file here → copy it to the box (`scp ops/hetzner/wedance-preview root@46.225.218.172:/usr/local/bin/`).

## TLS

Every preview uses one `*.dev.wedance.vip` Let's Encrypt certificate (`config.json`:
`"cert_resolver": "netlify", "wildcard": true`), so new PRs don't count against Let's Encrypt's
50 certificates a week per wedance.vip.

- wedance.vip's DNS is **Netlify DNS** (not Vercel). Traefik's `netlify` resolver in
  `/etc/dokploy/traefik/traefik.yml` proves ownership with a DNS (TXT) challenge and renews on its own.
- It uses a Netlify personal access token (no expiry), named `traefik-dns`: `~/Secrets/netlify-traefik-dns.token`
  locally, `/etc/wedance-preview/netlify.token` on the box. Traefik gets it as `NETLIFY_TOKEN`, set
  through Dokploy (`settings.writeTraefikEnv`, which recreates the Traefik container, a few seconds
  of downtime for every site). If the token is revoked, renewals fail silently: create a new one,
  then write it again the same way.
- Brievcase keeps its Cloudflare origin certificate (`dynamic/brievcase-cert.yml`).
- If Dokploy's panel ever rewrites `traefik.yml`, the `netlify` resolver block must be added back
  (backup in `/root/backups/traefik.yml.*`).

## Commands (on the box)

```
wedance-preview list
wedance-preview up 123 ghcr.io/razbakov/wedance-2026:pr-123-<sha>
wedance-preview down 123
wedance-preview seed
```
