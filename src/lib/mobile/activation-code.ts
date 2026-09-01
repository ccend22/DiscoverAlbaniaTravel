import { customAlphabet } from "nanoid";
import { createHash } from "node:crypto";

// Same Crockford-style alphabet as reference-code.ts (no 0/O/1/I ambiguity)
// -- this code gets typed by hand on a small device screen, unlike a
// bearer token, so legibility matters more than raw entropy. 30 minutes is
// enough for someone to walk from wherever the code was generated to the
// device being activated.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const generate = customAlphabet(ALPHABET, 8);
export const ACTIVATION_CODE_TTL_MS = 30 * 60 * 1000;

export function generateActivationCode(): string {
  return generate();
}

// Hashed at rest for the same reason refresh tokens are (see
// refresh-token.ts) -- a short 8-character code is guessable enough that a
// database read shouldn't hand out a working credential directly.
export function hashActivationCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase()).digest("hex");
}
