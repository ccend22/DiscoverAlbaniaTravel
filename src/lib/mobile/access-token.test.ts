import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { issueMobileAccessToken, verifyMobileAccessToken, type MobileAccessTokenPayload } from "./access-token";

function payload(overrides: Partial<MobileAccessTokenPayload> = {}): MobileAccessTokenPayload {
  return {
    vendorUserId: 1,
    deviceId: 2,
    operatorId: 3,
    isOwner: false,
    permissions: ["scanner"],
    capabilities: { sellingEnabled: false, fiscalPrintingEnabled: false },
    ...overrides,
  };
}

test("a freshly issued token verifies back to the same payload", () => {
  const { token } = issueMobileAccessToken(payload({ vendorUserId: 42 }));
  const verified = verifyMobileAccessToken(token);
  assert.ok(verified);
  assert.equal(verified?.vendorUserId, 42);
  assert.deepEqual(verified?.permissions, ["scanner"]);
});

test("a tampered payload segment fails verification", () => {
  const { token } = issueMobileAccessToken(payload());
  const [, signature] = token.split(".");
  const tamperedPayload = Buffer.from(JSON.stringify({ vendorUserId: 999 })).toString("base64url");
  assert.equal(verifyMobileAccessToken(`${tamperedPayload}.${signature}`), null);
});

test("a tampered signature fails verification", () => {
  const { token } = issueMobileAccessToken(payload());
  const [encoded] = token.split(".");
  assert.equal(verifyMobileAccessToken(`${encoded}.not-the-real-signature`), null);
});

test("a malformed token (no separator) fails verification", () => {
  assert.equal(verifyMobileAccessToken("not-a-valid-token"), null);
});

test("a token past its 15-minute TTL fails verification", () => {
  const { token } = issueMobileAccessToken(payload());
  assert.ok(verifyMobileAccessToken(token), "should verify immediately after issuing");

  // MockTimers starts its clock at epoch 0 unless told otherwise -- without
  // `now`, ticking 16 minutes forward would still land far earlier than the
  // token's real expiresAt (a real current timestamp), so the token would
  // never actually appear expired.
  mock.timers.enable({ apis: ["Date"], now: Date.now() });
  try {
    mock.timers.tick(16 * 60 * 1000);
    assert.equal(verifyMobileAccessToken(token), null);
  } finally {
    mock.timers.reset();
  }
});
