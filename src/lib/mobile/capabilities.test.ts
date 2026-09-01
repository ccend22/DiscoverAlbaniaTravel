import assert from "node:assert/strict";
import test from "node:test";
import { getMobileCapabilities } from "./capabilities";

function withEnv(vars: Record<string, string | undefined>, run: () => void) {
  const originals: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) originals[key] = process.env[key];
  try {
    for (const [key, value] of Object.entries(vars)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    run();
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("production always disables both capabilities, regardless of the override", () => {
  withEnv({ NODE_ENV: "production", MOBILE_CAPABILITIES_OVERRIDE: "true" }, () => {
    assert.deepEqual(getMobileCapabilities(), { sellingEnabled: false, fiscalPrintingEnabled: false });
  });
});

test("non-production without the override defaults to disabled", () => {
  withEnv({ NODE_ENV: "development", MOBILE_CAPABILITIES_OVERRIDE: undefined }, () => {
    assert.deepEqual(getMobileCapabilities(), { sellingEnabled: false, fiscalPrintingEnabled: false });
  });
});

test("non-production with the override explicitly set to 'true' enables both", () => {
  withEnv({ NODE_ENV: "development", MOBILE_CAPABILITIES_OVERRIDE: "true" }, () => {
    assert.deepEqual(getMobileCapabilities(), { sellingEnabled: true, fiscalPrintingEnabled: true });
  });
});

test("any override value other than the literal string 'true' stays disabled", () => {
  withEnv({ NODE_ENV: "development", MOBILE_CAPABILITIES_OVERRIDE: "yes" }, () => {
    assert.deepEqual(getMobileCapabilities(), { sellingEnabled: false, fiscalPrintingEnabled: false });
  });
});
