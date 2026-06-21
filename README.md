# RDW

Railway Deployment Watcher shows deployments across selected Railway workspaces in one read-only dashboard.

## Local Development

```bash
bun install
cp .env.example .env
bun run db:migrate
bun run dev
```

Create a Railway OAuth app with this local redirect URI:

```text
http://localhost:3000/api/auth/oauth2/callback/railway
```

For production, add this redirect URI:

```text
https://rdw.pdcd.net/api/auth/oauth2/callback/railway
```

Then set `RAILWAY_OAUTH_CLIENT_ID`, `RAILWAY_OAUTH_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, and `TOKEN_ENCRYPTION_KEY` in `.env`.

Generate a 32-byte base64 encryption key with:

```bash
openssl rand -base64 32
```

## Deploy

RDW is configured for Railway with `Dockerfile` and `railway.toml`. Connect a Railway Postgres service and set the variables listed in `.env.example`. Configure the service healthcheck path to `/api/health`.

## Tests

```bash
bun test
bun run typecheck
bun run build
```
