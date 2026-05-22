/**
 * Decode a `Basic <base64>` Authorization header.
 * Returns { user, pass } on success, null otherwise.
 */
export function parseBasicAuth(
  header: string | null | undefined,
): { user: string; pass: string } | null {
  if (!header || typeof header !== "string") return null;
  const match = /^Basic\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  let decoded: string;
  try {
    decoded = atob(match[1].trim());
  } catch {
    return null;
  }
  const idx = decoded.indexOf(":");
  if (idx < 0) return null;
  return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
}

/**
 * Timing-safe string comparison. Returns false on length mismatch
 * without short-circuiting on the contents.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * True iff the Authorization header carries Basic credentials matching
 * the expected user/pass. Missing or malformed → false.
 */
export function isAuthorized(
  header: string | null | undefined,
  expectedUser: string | undefined,
  expectedPass: string | undefined,
): boolean {
  if (!expectedUser || !expectedPass) return false;
  const creds = parseBasicAuth(header);
  if (!creds) return false;
  const userOk = timingSafeEqual(creds.user, expectedUser);
  const passOk = timingSafeEqual(creds.pass, expectedPass);
  return userOk && passOk;
}
