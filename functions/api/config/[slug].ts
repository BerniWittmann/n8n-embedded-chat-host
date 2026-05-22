// GET /api/config/<slug>
//
// Returns { webhookUrl, defaultGreeting } for known slugs.
// The middleware has already enforced basic-auth on private slugs by the time
// this function is reached for those paths. For public slugs (and the
// asset-bypassed /api/* path itself), the config is non-sensitive: the
// webhookUrl is the same one the page mounts as the chat target.

import {
  parseSlugConfig,
  toPublicConfig,
  type SlugConfigMap,
} from "../../../lib/config";
import { isAuthorized } from "../../../lib/auth";

type Env = {
  SLUG_CONFIG?: string;
  BASIC_AUTH_USER?: string;
  BASIC_AUTH_PASSWORD?: string;
};

type Params = { slug: string };

type PagesFunction<E = unknown, P = unknown> = (context: {
  request: Request;
  env: E;
  params: P;
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

export const onRequestGet: PagesFunction<Env, Params> = async (context) => {
  const slug = context.params.slug;
  const map = getConfig(context.env.SLUG_CONFIG);

  if (!slug || !Object.prototype.hasOwnProperty.call(map, slug)) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const entry = map[slug];

  // The middleware doesn't see /api/* (it's in the asset bypass list), so
  // we re-enforce auth here for private slugs.
  if (entry.private) {
    const auth = context.request.headers.get("authorization");
    if (
      !isAuthorized(
        auth,
        context.env.BASIC_AUTH_USER,
        context.env.BASIC_AUTH_PASSWORD,
      )
    ) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: {
          "www-authenticate": 'Basic realm="chat"',
          "content-type": "application/json; charset=utf-8",
        },
      });
    }
  }

  return new Response(
    JSON.stringify(toPublicConfig(entry)),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
};
