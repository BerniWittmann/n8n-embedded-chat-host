# Goal: Self-hosted embedded n8n chat page with dynamic greeting

Build a small Next.js + TypeScript + Tailwind app, deployed to Cloudflare Pages at `chat.bernhardwittmann.com`, that hosts the `@n8n/chat` embedded widget for one or more n8n workflows. The page maps a URL path (`/<slug>`) to a workflow webhook via a single Cloudflare env var, forwards a `?greeting=` query parameter into the chat's `metadata` so workflows can produce dynamic greetings, and gates each slug independently as public or private via a Cloudflare Pages Functions basic-auth middleware that reuses the n8n basic auth credentials.

## Shared understanding

See [facts.md](./facts.md) for the 18 accepted facts that define done.

## Execution plan

See [plan.md](./plan.md) for the ordered steps, verification commands, and risks.

## Done condition

- The repo `BerniWittmann/n8n-embedded-chat-host` exists with the scaffold described in `plan.md`.
- Pushing to `main` deploys to Cloudflare Pages at `chat.bernhardwittmann.com`.
- `pnpm test`, `pnpm lint`, `pnpm tsc --noEmit`, and `pnpm build` all pass.
- The curl matrix in plan step 4 passes against the live domain: unknown slug → 404, public slug → 200, private slug → 401 without creds and 200 with creds, `/api/config/<slug>` returns the right JSON for public slugs and is gated for private ones, static assets bypass auth.
- The existing workflow `vzXTteUPEAbSzHwk` is migrated to Embedded Chat with Authentication = None and reads `metadata.greeting` to produce a dynamic first response, reachable at `chat.bernhardwittmann.com/<slug>?greeting=...`.
- README documents env var format, local dev, and how to add a new slug without redeploying.
