# Launch Plan: Execute the embedded-chat-host goal

This is the execution wrapper around the detailed [plan.md](./plan.md). It captures the decisions made at launch time and the order in which I will work through plan.md's steps.

## Context

- Goal, facts, and detailed step-by-step plan are already accepted (see `goal.md`, `facts.md`, `plan.md`).
- I'm now executing plan.md against the working tree at `~/DEV/n8n-embedded-chat-host/` (which is the current cwd and already contains `goals/`).

## Decisions locked in at launch

| Decision | Value |
|---|---|
| Repo working tree | `~/DEV/n8n-embedded-chat-host/` (current cwd; `goals/` stays as a subfolder, gitignored from build but committed to repo) |
| First slug | `ai-coach` |
| `defaultGreeting` | `"Hi! I'm your AI work coach. I have access to your daily reflections, weekly summaries, and work log. What would you like to work through today?"` |
| `private` | `true` |
| Autonomy | I scaffold + code + test + commit + create the GitHub repo (`BerniWittmann/n8n-embedded-chat-host`) via `gh` + push `main`. You handle the Cloudflare Pages dashboard (project creation, env vars, custom domain) and the n8n workflow migration. |
| Package manager | `pnpm` (confirmed installed) |
| GitHub CLI | `gh` (confirmed installed) |
| Wrangler | run via `npx wrangler` (not installed globally) |

## Approach

Walk plan.md's seven steps in order. Each step's "Verification" block is the gate before moving to the next. I do not run any Cloudflare dashboard or n8n actions — those are handed off to you with a concise checklist at the end.

## Files to create (top level)

The scaffold from plan.md step 1, plus:
- `lib/{config,greeting,auth,slug}.ts` + matching `*.test.ts` (step 2)
- `app/{layout,page,not-found}.tsx`, `app/globals.css`, `components/ChatMount.tsx` (step 3)
- `functions/_middleware.ts`, `functions/api/config/[slug].ts` (step 4)
- `public/_redirects` (step 4)
- `README.md` (step 7)
- `.gitignore` includes `goals/` is **not** added — we want the goal docs committed so the repo carries its own design context. But `out/`, `node_modules/`, `.next/`, `.wrangler/`, `coverage/` are ignored.

## Reuse

- Baseline conventions per plan.md "mirror ava-music" — Next 15 + React 18 + ESLint config-next. (ava-music repo not present locally; will derive the baseline straight from `create-next-app` defaults + `output: 'export'`.)
- `@n8n/chat` for the widget (only runtime dep beyond next/react/tailwind).
- `vitest` + `@vitest/coverage-v8` for unit tests on `lib/`.

## Steps (mirrors plan.md, with execution notes)

- [ ] **1. Scaffold** — `pnpm init`, install deps (`next react react-dom @n8n/chat`, dev: `typescript @types/* tailwindcss postcss autoprefixer eslint eslint-config-next vitest @vitest/coverage-v8 jsdom`). Write configs. Verify `pnpm install && pnpm build && pnpm lint && pnpm tsc --noEmit`.
- [ ] **2. lib/** test-first — implement `config.ts`, `greeting.ts`, `auth.ts`, `slug.ts` with vitest. Target ≥90% coverage per file. `pnpm test` green.
- [ ] **3. Client shell** — `app/page.tsx` reads pathname, fetches `/api/config/<slug>`, mounts `@n8n/chat` via dynamic `import('@n8n/chat')` inside `useEffect` (mitigates the SSR/`window` risk noted in plan.md). Tailwind centered layout, neutral background. `pnpm build` succeeds. `pnpm dev` smoke test with a local mock config (a `.env.local`-driven dev fallback in `/api/config/[slug]` is out of scope; instead a temporary hardcoded dev mock guarded by `process.env.NODE_ENV === 'development'` in `app/page.tsx`).
- [ ] **4. Cloudflare Functions** — `functions/_middleware.ts` + `functions/api/config/[slug].ts` + `public/_redirects`. Run the full curl matrix via `npx wrangler pages dev out` with `SLUG_CONFIG`, `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD` bindings as in plan.md step 4. Every curl in that matrix must return the expected status.
- [ ] **5. Git + GitHub** — `git init`, commit, `gh repo create BerniWittmann/n8n-embedded-chat-host --public --source=. --push`. Then **stop and hand off** for Cloudflare Pages setup.
- [ ] **6. (You)** — Migrate workflow `vzXTteUPEAbSzHwk` per plan.md step 6. Set the `ai-coach` slug entry in `SLUG_CONFIG`:
  ```json
  {
    "ai-coach": {
      "webhookUrl": "<paste new webhook URL>",
      "defaultGreeting": "Hi! I'm your AI work coach. I have access to your daily reflections, weekly summaries, and work log. What would you like to work through today?",
      "private": true
    }
  }
  ```
- [ ] **7. README** — write before pushing in step 5 so the repo lands documented.

## Verification (end-to-end, after your dashboard steps)

Run the curl matrix from plan.md step 4 against `https://chat.bernhardwittmann.com`:

```bash
DOMAIN=https://chat.bernhardwittmann.com
SLUG=ai-coach
curl -i $DOMAIN/                                    # → 404
curl -i $DOMAIN/missing                             # → 404
curl -i $DOMAIN/$SLUG                               # → 401 (private)
curl -i -u admin:$N8N_PASS $DOMAIN/$SLUG            # → 200
curl -i $DOMAIN/api/config/$SLUG                    # → 401
curl -i -u admin:$N8N_PASS $DOMAIN/api/config/$SLUG # → 200 JSON {webhookUrl, defaultGreeting}
```

Then in a browser:
- `https://chat.bernhardwittmann.com/ai-coach` → basic-auth prompt → widget appears with neutral background, centered, responsive to 375px.
- Sending a message: n8n execution shows `metadata.greeting = "Hi! I'm your AI work coach…"`.
- Same URL with `?greeting=test` after re-auth → execution shows `metadata.greeting = "test"`.

## Risks (delta from plan.md)

- `goals/` directory committed to the public repo will expose this planning context (including the workflow ID `vzXTteUPEAbSzHwk`). That ID is not secret on its own (it's just an n8n workflow identifier and the webhook auth is None plus the host gate). If you'd rather keep `goals/` private, say so and I'll add it to `.gitignore` before the first commit.
- Wrangler is not installed globally — `npx wrangler pages dev out` will download it on first run; harmless but slower.
- `ava-music` baseline not actually accessible locally; the scaffold will use `create-next-app` defaults adapted for static export. If you want exact parity with ava-music's lint/tsconfig, point me at it and I'll mirror it before step 2.
