import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("base64url");
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [scheme, iterationsRaw, salt, hash] = storedHash.split("$");
  if (scheme !== "pbkdf2" || !iterationsRaw || !salt || !hash) return false;

  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;

  const expected = Buffer.from(hash, "base64url");
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, DIGEST);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// A fixed, well-formed hash with no real password behind it. Login lookups
// that short-circuit on "no such account" and skip verifyPassword entirely
// respond measurably faster than a "wrong password" attempt (~210k PBKDF2
// iterations vs a single indexed lookup) -- an attacker can use that timing
// gap to enumerate which emails have accounts. Verifying against this dummy
// hash whenever the real one is missing keeps both paths the same cost.
const DUMMY_HASH = hashPassword(randomBytes(32).toString("hex"));

export function verifyPasswordAgainstAccount(password: string, storedHash: string | null | undefined): boolean {
  return verifyPassword(password, storedHash ?? DUMMY_HASH);
}
