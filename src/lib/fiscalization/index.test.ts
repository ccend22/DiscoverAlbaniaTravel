import assert from "node:assert/strict";
import test from "node:test";
import { StubFiscalizationProvider, getFiscalizationProvider } from "./index";

test("the stub provider never reports success", async () => {
  const provider = new StubFiscalizationProvider();
  const result = await provider.requestFiscalization({
    bookingId: 1,
    amount: "10.00",
    currency: "EUR",
    passengerName: "Test",
    issuedAt: new Date(),
  });
  assert.equal(result.fiscalized, false);
  assert.ok(result.reason);
});

test("getFiscalizationProvider returns a provider instance", async () => {
  const provider = getFiscalizationProvider();
  const result = await provider.requestFiscalization({
    bookingId: 1,
    amount: "10.00",
    currency: "EUR",
    passengerName: "Test",
    issuedAt: new Date(),
  });
  assert.equal(result.fiscalized, false);
});
