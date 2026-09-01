import assert from "node:assert/strict";
import test from "node:test";
import { generateActivationCode, hashActivationCode } from "./activation-code";

test("generated codes are 8 characters from the unambiguous Crockford-style alphabet", () => {
  const code = generateActivationCode();
  assert.equal(code.length, 8);
  assert.match(code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
});

test("hashing is case-insensitive, so a code typed in lowercase still matches", () => {
  const code = generateActivationCode();
  assert.equal(hashActivationCode(code), hashActivationCode(code.toLowerCase()));
});

test("different codes hash to different values", () => {
  const a = generateActivationCode();
  const b = generateActivationCode();
  assert.notEqual(hashActivationCode(a), hashActivationCode(b));
});
