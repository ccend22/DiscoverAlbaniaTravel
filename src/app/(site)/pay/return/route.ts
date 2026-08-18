import { NextResponse, type NextRequest } from "next/server";
import { getSiteOrigin } from "@/lib/google-oauth";
import { devMarkPaymentPaid, findPaymentIdForReference, verifyAndSettlePokPayment } from "@/db/queries/payments";

/**
 * POK redirects the customer's browser here after checkout -- both on
 * success (`redirectUrl`) and failure (`failRedirectUrl`), since we can't
 * trust which one actually fired without a signature scheme, we always
 * re-verify against POK's own API before deciding what happened. The
 * confirmation page renders whatever the real, settled state is. Serves
 * both bus bookings and taxi requests -- their reference prefixes ("DA-" vs
 * "TX-") tell the two apart, see findPaymentIdForReference.
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("ref");
  const embedded = request.nextUrl.searchParams.get("embedded") === "1";
  // Dev-only escape hatch so the whole flow (payment -> email -> manage
  // link) can be exercised on localhost without a real POK charge. The
  // `dev` param alone can't do anything in production -- devMarkPaymentPaid
  // re-checks NODE_ENV itself.
  const devComplete = request.nextUrl.searchParams.get("dev") === "1" && process.env.NODE_ENV !== "production";

  if (!reference) {
    return embedded ? notifyParentHtml(null) : NextResponse.redirect(new URL("/", getSiteOrigin()));
  }

  try {
    if (devComplete) {
      await devMarkPaymentPaid(reference);
    } else {
      const paymentId = await findPaymentIdForReference(reference);
      if (paymentId) await verifyAndSettlePokPayment(paymentId);
    }
  } catch (error) {
    console.error("[pok-payments] return verification failed", { reference, error });
    // Fall through to the confirmation page regardless -- it shows whatever
    // state actually landed (possibly still "pending"), and the webhook or
    // sweep will catch it later if this verification attempt is the one
    // that failed transiently.
  }

  // The inline checkout flow embeds POK's hosted page in an iframe rather
  // than navigating the whole tab there. POK still navigates *that iframe*
  // here on completion, so instead of redirecting (which would render our
  // full site chrome inside the small iframe box) this tells the parent tab
  // -- via postMessage, since the iframe is same-origin by the time it
  // lands here -- to take over the navigation.
  if (embedded) {
    return notifyParentHtml(reference);
  }

  const destination = reference.startsWith("TX-") ? `/taxi/request/${reference}` : `/booking/${reference}`;
  return NextResponse.redirect(new URL(destination, getSiteOrigin()));
}

function notifyParentHtml(reference: string | null): NextResponse {
  const payload = JSON.stringify({ source: "pok-payment-return", reference })
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const html = `<!doctype html><html><body><script>window.parent.postMessage(${payload}, window.location.origin);</script></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
