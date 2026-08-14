import { NextResponse, type NextRequest } from "next/server";
import { findPaymentIdByProviderPaymentId, verifyAndSettlePokPayment } from "@/db/queries/payments";

// POK's webhook payload shape isn't documented (no schema, no signature
// scheme) -- this only ever uses the incoming body to find *which* order to
// re-check, never to decide the outcome. Tries the same {data:{sdkOrder:{id}}}
// envelope POK's own REST responses use, plus a couple of flatter fallbacks.
function extractOrderId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const candidates = [
    (body as { data?: { sdkOrder?: { id?: unknown } } }).data?.sdkOrder?.id,
    (body as { sdkOrder?: { id?: unknown } }).sdkOrder?.id,
    (body as { orderId?: unknown }).orderId,
    (body as { id?: unknown }).id,
  ];
  const found = candidates.find((c) => typeof c === "string" && c.length > 0);
  return typeof found === "string" ? found : null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const orderId = extractOrderId(body);

  if (!orderId) {
    console.error("[pok-payments] webhook: could not extract an order id", { body });
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const paymentId = await findPaymentIdByProviderPaymentId(orderId);
  if (!paymentId) {
    console.error("[pok-payments] webhook: no payment found for order", { orderId });
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  try {
    await verifyAndSettlePokPayment(paymentId);
  } catch (error) {
    console.error("[pok-payments] webhook verification failed", { paymentId, error });
  }

  // Always 200 -- POK's retry/backoff contract isn't documented, and this
  // endpoint is a best-effort safety net anyway (the return-redirect path
  // and the sweep both independently reach the same settled state).
  return NextResponse.json({ ok: true });
}
