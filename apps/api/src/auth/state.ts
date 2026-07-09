import { timingSafeEqual } from "node:crypto";

/**
 * OAuth login-CSRF defense. On /login we mint a random `state`, store it in a short-lived
 * cookie, and put it in the authorize URL. On /callback we compare the returned state to the
 * cookie with a constant-time check. An attacker who forges a callback has no matching cookie,
 * so their code is rejected. (This function is the whole fix for the S02 CSRF arc.)
 */
export function statesMatch(cookieState: string | undefined, paramState: string | undefined): boolean {
  if (!cookieState || !paramState) return false;
  const a = Buffer.from(cookieState);
  const b = Buffer.from(paramState);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
