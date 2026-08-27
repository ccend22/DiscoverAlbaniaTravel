import assert from "node:assert/strict";
import test from "node:test";
import type { VendorFinanceTransactionRow } from "@/db/queries/vendors";
import { buildVendorFinanceView, resolveVendorFinancePeriod } from "@/lib/vendor-finance";

function transaction(overrides: Partial<VendorFinanceTransactionRow> = {}): VendorFinanceTransactionRow {
  return {
    bookingId: 1,
    bookingReference: "DA-TEST1",
    bookingStatus: "confirmed",
    channel: "online",
    seats: 2,
    travelDate: "2026-08-28",
    createdAt: new Date("2026-08-20T10:00:00Z"),
    routeCode: "TIR-DUR",
    fromStationName: "Tirana",
    toStationName: "Durrës",
    paymentAmount: "32.00",
    paymentCurrency: "EUR",
    paymentStatus: "paid",
    paymentProvider: "pok",
    paymentEffectiveAt: new Date("2026-08-20T10:05:00Z"),
    ...overrides,
  };
}

test("finance recognizes only paid confirmed bookings as operator earnings", () => {
  const period = resolveVendorFinancePeriod("custom", "2026-08-01", "2026-08-31");
  const view = buildVendorFinanceView(
    [
      transaction(),
      transaction({ bookingId: 2, bookingReference: "DA-TEST2", paymentStatus: "pending", paymentAmount: "22.00" }),
      transaction({ bookingId: 3, bookingReference: "DA-TEST3", bookingStatus: "cancelled", paymentAmount: "12.00" }),
    ],
    period
  );

  assert.equal(view.summary.grossCollectedEur, 32);
  assert.equal(view.summary.platformFeesEur, 1);
  assert.equal(view.summary.operatorEarningsEur, 31);
  assert.equal(view.summary.pendingAmountEur, 22);
  assert.equal(view.summary.reviewCount, 1);
  assert.equal(view.summary.paidBookings, 1);
  assert.equal(view.summary.seatsSold, 2);
});

test("finance converts legacy ALL payments to EUR before subtracting the fee", () => {
  const period = resolveVendorFinancePeriod("all", undefined, undefined);
  const view = buildVendorFinanceView(
    [transaction({ paymentAmount: "2200", paymentCurrency: "ALL" })],
    period
  );

  assert.equal(view.summary.grossCollectedEur, 22);
  assert.equal(view.summary.operatorEarningsEur, 21);
});

test("custom periods filter by the payment effective date", () => {
  const period = resolveVendorFinancePeriod("custom", "2026-08-21", "2026-08-31");
  const view = buildVendorFinanceView([transaction()], period);

  assert.equal(view.transactions.length, 0);
  assert.equal(view.summary.operatorEarningsEur, 0);
});

test("cancelled bookings without a payment are closed, not missing-payment alerts", () => {
  const period = resolveVendorFinancePeriod("all", undefined, undefined);
  const view = buildVendorFinanceView(
    [transaction({ bookingStatus: "cancelled", paymentAmount: null, paymentCurrency: null, paymentStatus: null })],
    period
  );

  assert.equal(view.summary.missingPaymentCount, 0);
  assert.equal(view.transactions[0]?.state, "closed");
});

test("invalid custom periods fall back to the current month", () => {
  const period = resolveVendorFinancePeriod(
    "custom",
    "2026-08-31",
    "2026-08-01",
    new Date("2026-08-27T10:00:00Z")
  );

  assert.equal(period.range, "this_month");
  assert.equal(period.from, "2026-08-01");
  assert.equal(period.to, "2026-08-27");
});
