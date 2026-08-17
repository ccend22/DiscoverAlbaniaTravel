import { NextResponse, type NextRequest } from "next/server";
import { getSiteOrigin } from "@/lib/google-oauth";
import { devMarkPaymentPaid, findPaymentIdForBookingReference, verifyAndSettlePokPayment } from "@/db/queries/payments";

/**
 * POK redirects the customer's browser here after checkout -- both on
 * success (`redirectUrl`) and failure (`failRedirectUrl`), since we can't
 * trust which one actually fired without a signature scheme, we always
 * re-verify against POK's own API before deciding what happened. The
 * booking confirmation page renders whatever the real, settled state is.
 */
export async function GET(request: NextRequest) {
  const bookingReference = request.nextUrl.searchParams.get("ref");
  const embedded = request.nextUrl.searchParams.get("embedded") === "1";
  // Dev-only escape hatch so the whole flow (payment -> email -> manage
  // link) can be exercised on localhost without a real POK charge. The
  // `dev` param alone can't do anything in production -- devMarkPaymentPaid
  // re-checks NODE_ENV itself.
  const devComplete = request.nextUrl.searchParams.get("dev") === "1" && process.env.NODE_ENV !== "production";

  if (!bookingReference) {
    return embedded ? notifyParentHtml(null) : NextResponse.redirect(new URL("/", getSiteOrigin()));
  }

  try {
    if (devComplete) {
      await devMarkPaymentPaid(bookingReference);
    } else {
      const paymentId = await findPaymentIdForBookingReference(bookingReference);
      if (paymentId) await verifyAndSettlePokPayment(paymentId);
    }
  } catch (error) {
    console.error("[pok-payments] return verification failed", { bookingReference, error });
    // Fall through to the confirmation page regardless -- it shows whatever
    // state actually landed (possibly still "pending"), and the webhook or
    // sweep will catch it later if this verification attempt is the one
    // that failed transiently.
  }

  // The inline checkout flow (book/[tripDepartureId]) embeds POK's hosted
  // page in an iframe rather than navigating the whole tab there. POK still
  // navigates *that iframe* here on completion, so instead of redirecting
  // (which would render our full site chrome inside the small iframe box)
  // this tells the parent tab -- via postMessage, since the iframe is
  // same-origin by the time it lands here -- to take over the navigation.
  if (embedded) {
    return notifyParentHtml(bookingReference);
  }

  return NextResponse.redirect(new URL(`/booking/${bookingReference}`, getSiteOrigin()));
}

function notifyParentHtml(bookingReference: string | null): NextResponse {
  const payload = JSON.stringify({ source: "pok-payment-return", bookingReference });
  const html = `<!doctype html><html><body><script>window.parent.postMessage(${payload}, window.location.origin);</script></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
