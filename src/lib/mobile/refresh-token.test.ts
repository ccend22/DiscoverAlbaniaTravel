import assert from "node:assert/strict";
import test from "node:test";
import { generateRefreshToken, hashRefreshToken } from "./refresh-token";

test("generated tokens are unique and reasonably long", () => {
  const a = generateRefreshToken();
  const b = generateRefreshToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 32);
});

test("hashing is deterministic for the same token", () => {
  const token = generateRefreshToken();
  assert.equal(hashRefreshToken(token), hashRefreshToken(token));
});

test("different tokens hash to different values", () => {
  const a = generateRefreshToken();
  const b = generateRefreshToken();
  assert.notEqual(hashRefreshToken(a), hashRefreshToken(b));
});

test("the hash never contains the raw token as a substring", () => {
  const token = generateRefreshToken();
  const hash = hashRefreshToken(token);
  assert.ok(!hash.includes(token));
});
