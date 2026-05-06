# SignalWatch

A real-time healthcare social listening platform that monitors Twitter/X, Reddit, and web sources for patient safety signals, adverse events, and treatment experiences — with AI-powered sentiment analysis, entity extraction, and PII detection.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000, via workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`, `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (artifacts/api-server, port 8080 → proxied to /api)
- Frontend: React + Vite (artifacts/signal-watch, port varies → proxied to /)
- DB: PostgreSQL + Drizzle ORM
- AI: OpenAI GPT via Replit AI integration (gpt-4o-mini for analysis)
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (OpenAPI → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle for API)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle schema (projects, keywords, sources, signals, engine-types)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod validators
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/ai-analysis.ts` — OpenAI analysis logic
- `artifacts/api-server/src/lib/data-collectors.ts` — Twitter/Reddit/mock collectors
- `artifacts/signal-watch/src/pages/` — React page components

## Architecture decisions

- Contract-first: OpenAPI spec → Orval codegen for both frontend hooks and server validators. Never hand-write these.
- Signal analysis via GPT-4o-mini: JSON-mode response for structured sentiment/entity/safety/PII extraction
- Engine type slug stored in `source.config._slug` so the dispatcher knows which collector to use
- `db.execute()` returns `{ rows: [...] }` not a raw array — always normalize with `Array.isArray(rows) ? rows : rows.rows`
- After every codegen run, verify `lib/api-zod/src/index.ts` exports only `./generated/api` (orval sometimes writes a stale barrel)

## Product

- Multi-project monitoring workspace with sidebar navigation and project switcher
- Dashboard: 30-day signal timeline (area chart), sentiment donut, top entities, safety alerts panel, batch analyze
- Signals feed: filterable by sentiment/safety flag, entity chips by type, confidence scores, PII warnings, per-signal analyze
- Keywords: chip-style keyword management (add/delete) per project
- Sources: data source cards with enable/disable toggle, trigger collection, engine type + latency config
- Admin: engine type management (name, slug, description, config schema), built-in badge

## User preferences

- Hackathon project — prioritize working features over polish
- No auth required
- Deep navy/teal color scheme for clinical/precision feel

## Gotchas

- Run `pnpm run typecheck:libs` after any lib changes before restarting the API workflow
- After codegen: overwrite `lib/api-zod/src/index.ts` to `export * from "./generated/api";` only
- Signal seeding: `pii_types` and `matched_keywords` are `text[]` — use `ARRAY['a','b']::text[]` syntax in raw SQL
- Timeline/sentiment/entities endpoints use `db.execute()` which returns `QueryResult` — normalize rows before `.map()`

## Pointers

- See `.local/skills/pnpm-workspace/references/openapi.md` for codegen details
- See `.local/skills/pnpm-workspace/references/server.md` for route/logging patterns
- See `.local/skills/pnpm-workspace/references/db.md` for schema migrations
