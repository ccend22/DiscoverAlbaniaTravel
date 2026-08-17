import nodemailer, { type Transporter } from "nodemailer";
import { getSiteOrigin } from "@/lib/google-oauth";
import { formatDateLong, formatPrice, formatTime } from "@/lib/format";
import { getDictionary } from "@/lib/dictionary";
import { normalizeLocale } from "@/lib/locale";
import type { BookingEmailDetail } from "@/db/queries/bookings";

export class EmailConfigError extends Error {}

function getConfig() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;
  const fromName = process.env.SMTP_FROM_NAME || "Discover Albania Transport";
  if (!user || !password || !fromEmail) {
    throw new EmailConfigError("SMTP_USER / SMTP_PASSWORD are not configured");
  }
  return { host, port, user, password, fromEmail, fromName };
}

// Reused across calls within this server instance's lifetime -- nodemailer
// transporters pool their own SMTP connections internally, so there's no
// benefit to reconnecting per email, only latency cost.
let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  const { host, port, user, password } = getConfig();
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });
  return cachedTransporter;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "\"": return "&quot;";
      default: return "&#39;";
    }
  });
}

/**
 * Sends the "your reservation is confirmed" email once a booking's payment
 * actually settles as paid (see verifyAndSettlePokPayment) -- never at
 * booking creation, since the reservation can still fail or expire before
 * payment completes. Best-effort: callers should treat a thrown error here
 * as non-fatal to the payment-settlement flow that triggered it.
 */
export async function sendBookingConfirmationEmail(detail: BookingEmailDetail): Promise<void> {
  const { fromEmail, fromName } = getConfig();
  const locale = normalizeLocale(detail.locale);
  const dict = getDictionary(locale);
  const be = dict.bookingEmail;
  const bc = dict.bookingConfirmation;

  const origin = getSiteOrigin();
  const logoUrl = `${origin}/dat-logo.png`;
  const manageUrl = detail.manageToken
    ? `${origin}/booking/${detail.bookingReference}/manage?token=${detail.manageToken}`
    : `${origin}/booking/${detail.bookingReference}`;

  const subject = be.subject.replace("{reference}", detail.bookingReference);

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f3f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f7f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #dce8e6;">
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <img src="${logoUrl}" alt="Discover Albania Transport" height="28" style="height:28px;display:block;" />
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0f8a7f;">${escapeHtml(be.kicker)}</p>
                <h1 style="margin:8px 0 0 0;font-size:26px;font-weight:800;color:#0b2b3c;">${escapeHtml(be.title)}</h1>
                <p style="margin:8px 0 0 0;font-size:14px;color:#5b6b6a;">${escapeHtml(be.greeting.replace("{name}", detail.passengerName))}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dce8e6;border-radius:16px;">
                  <tr>
                    <td style="padding:18px 20px 0 20px;">
                      <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;color:#8a9998;">${escapeHtml(bc.bookingReference)}</p>
                      <p style="margin:2px 0 0 0;font-family:monospace;font-size:18px;font-weight:800;color:#0b2b3c;">${escapeHtml(detail.bookingReference)}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 20px 0 20px;font-size:14px;color:#0b2b3c;">
                      <strong>${escapeHtml(detail.trip.fromStationName)}</strong> → <strong>${escapeHtml(detail.trip.toStationName)}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 20px 0 20px;font-size:13px;color:#5b6b6a;">
                      ${escapeHtml(formatDateLong(detail.travelDate, locale))} · ${escapeHtml(formatTime(detail.trip.departureTime))}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 20px 18px 20px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#5b6b6a;border-top:1px dashed #dce8e6;padding-top:12px;">
                        <tr>
                          <td style="padding-top:12px;">${escapeHtml(bc.passenger)}<br/><strong style="color:#0b2b3c;">${escapeHtml(detail.passengerName)}</strong></td>
                          <td style="padding-top:12px;" align="right">${escapeHtml(bc.seats)}<br/><strong style="color:#0b2b3c;">${detail.seats}</strong></td>
                        </tr>
                        <tr>
                          <td style="padding-top:10px;">${escapeHtml(bc.totalPrice)}<br/><strong style="color:#0b2b3c;">${escapeHtml(formatPrice(detail.priceAtBooking, detail.seats, locale))}</strong></td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;" align="center">
                <a href="${manageUrl}" style="display:inline-block;background-color:#0f8a7f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:999px;">${escapeHtml(be.manageButton)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 28px 32px;" align="center">
                <p style="margin:0;font-size:12px;color:#8a9998;">${escapeHtml(be.footerNote)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `${be.title}`,
    "",
    `${bc.bookingReference}: ${detail.bookingReference}`,
    `${detail.trip.fromStationName} -> ${detail.trip.toStationName}`,
    `${formatDateLong(detail.travelDate, locale)} - ${formatTime(detail.trip.departureTime)}`,
    `${bc.passenger}: ${detail.passengerName}`,
    `${bc.seats}: ${detail.seats}`,
    `${bc.totalPrice}: ${formatPrice(detail.priceAtBooking, detail.seats, locale)}`,
    "",
    `${be.manageButton}: ${manageUrl}`,
  ].join("\n");

  await getTransporter().sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: detail.passengerEmail,
    subject,
    html,
    text,
  });
}
