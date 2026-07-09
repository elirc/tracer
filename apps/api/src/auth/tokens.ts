import { randomBytes, createHash } from "node:crypto";

/** A URL-safe random secret (session tokens, invite tokens, oauth state). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Store only the hash of a token at rest; the raw token lives in a cookie/URL, never the DB. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
