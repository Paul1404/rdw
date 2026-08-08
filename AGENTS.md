# Repository guidance

This is the canonical instruction file for RDW. Claude Code loads it through
`CLAUDE.md`.

## Start here

- Inspect branch, upstream divergence, status, and diff before editing.
- Preserve pre-existing work.
- Keep the current Bun, TanStack Start, oRPC, better-auth, Drizzle, PostgreSQL,
  and Railway stack.
- Do not migrate an existing project merely to match a preferred stack.
- Verify current package and Railway documentation when behavior is
  version-dependent.

## Product and boundaries

RDW is a read-only Railway deployment dashboard.

- Railway OAuth tokens and application secrets remain server-side and encrypted.
- Do not add Railway mutations without an explicit product decision and a
  corresponding authorization and audit design.
- Server-only code stays under `src/server/`. Components use procedures or
  server routes.
- Every protected procedure performs its own authorization check.
- Never edit `src/routeTree.gen.ts` or generated Drizzle migrations manually.
- The configured health endpoint is `/api/health`. Verify the repository and
  live service settings before changing it.

## Commands

- `bun run dev`: local development
- `bun run typecheck`: TypeScript validation
- `bun run lint`: Biome validation
- `bun run test`: test suite
- `bun run build`: production build
- `bun run db:generate`: generate migrations
- `bun run db:migrate:prod`: production migrator

The detailed previous guide is preserved in `docs/agent-reference.md`. Consult
its project-specific sections for OAuth, encryption, deployment, and known
framework gotchas.

## Verification

Run type checking, linting, tests, and the build as appropriate. Exercise the
affected authenticated flow or endpoint. Deployment claims require live
deployment and endpoint verification.

## Maintaining this file

Add durable repository knowledge here when it prevents repeated mistakes.
Keep this file concise, place detail in `docs/`, and keep `CLAUDE.md` as the
compatibility import.
