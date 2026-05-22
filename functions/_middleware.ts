// Cloudflare Pages middleware. Runs before static asset serving on every
// request hitting this Pages project.
//
// Logic:
//   1. Pass-through for static asset / API / well-known paths.
//   2. Look up slug in SLUG_CONFIG (parsed lazily, cached per worker isolate).
//   3. 404 for `/`, unknown slugs, or multi-segment paths.
//   4. Enforce HTTP Basic Auth on private slugs.
//   5. Otherwise serve the SPA shell via next().

import { parseSlugConfig, type SlugConfigMap } from "../lib/config";
import { extractSlug } from "../lib/slug";
import { isAuthorized } from "../lib/auth";

type Env = {
  SLUG_CONFIG?: string;
  BASIC_AUTH_USER?: string;
  BASIC_AUTH_PASSWORD?: string;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
};

type PagesFunction<E = unknown> = (context: {
  request: Request;
  env: E;
  next: (input?: Request | string) => Promise<Response>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}) => Response | Promise<Response>;

let cachedConfig: { raw: string; map: SlugConfigMap } | null = null;

function getConfig(raw: string | undefined): SlugConfigMap {
  const safe = raw ?? "";
  if (!cachedConfig || cachedConfig.raw !== safe) {
    cachedConfig = { raw: safe, map: parseSlugConfig(safe) };
  }
  return cachedConfig.map;
}

const ASSET_PREFIXES = ["/_next/", "/api/", "/_redirects"];
const ASSET_EXACT = new Set(["/favicon.ico", "/robots.txt", "/sitemap.xml"]);
const ASSET_EXT_RE =
  /\.(?:js|mjs|css|map|json|ico|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2|ttf|otf|txt|xml)$/i;

function isAssetPath(pathname: string): boolean {
  if (ASSET_EXACT.has(pathname)) return true;
  for (const p of ASSET_PREFIXES) if (pathname.startsWith(p)) return true;
  if (ASSET_EXT_RE.test(pathname)) return true;
  return false;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  if (isAssetPath(pathname)) {
    return context.next();
  }

  const map = getConfig(context.env.SLUG_CONFIG);
  const slug = extractSlug(pathname);

  if (!slug || !Object.prototype.hasOwnProperty.call(map, slug)) {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const entry = map[slug];
  if (entry.private) {
    // Per-slug `n8nAuth` credentials take precedence over the global
    // BASIC_AUTH_* env vars. That way a slug with n8nAuth is
    // fully self-contained: one credential pair gates both the page
    // and the n8n webhook.
    const expectedUser = entry.n8nAuth?.user ?? context.env.BASIC_AUTH_USER;
    const expectedPass = entry.n8nAuth?.pass ?? context.env.BASIC_AUTH_PASSWORD;
    const auth = context.request.headers.get("authorization");
    if (!isAuthorized(auth, expectedUser, expectedPass)) {
      return new Response("Authentication required", {
        status: 401,
        headers: {
          "www-authenticate": 'Basic realm="chat"',
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }
  }

  // Serve the SPA shell for valid slug paths. We can't rely on `next()`
  // because the slug path has no matching static file, and the `_redirects`
  // SPA fallback rule (`/* /index.html 200`) is flagged as an infinite loop
  // by Cloudflare's parser. Fetch /index.html directly from the ASSETS
  // binding (production) or fall back to next() rewriting to /index.html.
  if (context.env.ASSETS) {
    const shellUrl = new URL("/index.html", url);
    const shellReq = new Request(shellUrl.toString(), {
      method: "GET",
      headers: context.request.headers,
    });
    return context.env.ASSETS.fetch(shellReq);
  }
  return context.next("/index.html");
};
