import nodemailer, { type Transporter } from "nodemailer";
import { getSiteOrigin } from "@/lib/google-oauth";
import { formatDateLong, formatPrice, formatTime } from "@/lib/format";
import { getDictionary } from "@/lib/dictionary";
import { normalizeLocale } from "@/lib/locale";
import type { BookingEmailDetail } from "@/db/queries/bookings";

export class EmailConfigError extends Error {}

const RESERVATION_NOTIFICATION_EMAIL =
  process.env.RESERVATION_NOTIFICATION_EMAIL || "endidiscoveral@gmail.com";

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
    bcc: RESERVATION_NOTIFICATION_EMAIL,
    subject,
    html,
    text,
  });
}

export interface TaxiReservationEmailDetail {
  requestReference: string;
  pickupLocation: string;
  exactPickupPoint: string | null;
  destination: string;
  pickupAt: Date;
  passengers: number;
  passengerName: string | null;
  passengerPhone: string;
  passengerEmail: string | null;
  amount: string;
  currency: string;
  notes: string | null;
}

function formatTaxiFare(amount: string, currency: string): string {
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(amount));
  return `${currency === "EUR" ? "€" : ""}${formatted}${currency === "ALL" ? " ALL" : ""}`;
}

/** Sends every private-transfer booking to the owner and a confirmation to the traveler -- fired once payment settles as paid (see verifyAndSettlePokPayment), never at booking creation. */
export async function sendTaxiReservationNotification(
  detail: TaxiReservationEmailDetail
): Promise<void> {
  const { fromEmail, fromName } = getConfig();
  const requestUrl = `${getSiteOrigin()}/taxi/request/${encodeURIComponent(detail.requestReference)}`;
  const pickupAt = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Tirane",
  }).format(detail.pickupAt);

  const rows = [
    ["Journey", `${detail.pickupLocation} → ${detail.destination}`],
    ["Pickup", pickupAt],
    ...(detail.exactPickupPoint ? [["Exact pickup point", detail.exactPickupPoint]] : []),
    ["Passengers", String(detail.passengers)],
    ["Phone", detail.passengerPhone],
    ["Passenger", detail.passengerName || "Guest"],
    ["Passenger email", detail.passengerEmail || "Not provided"],
    ["Fare paid", formatTaxiFare(detail.amount, detail.currency)],
    ["Trip details", detail.notes || "None"],
  ];

  const htmlRows = rows
    .map(
      ([label, value]) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #dce8e6;color:#687775;font-size:12px;vertical-align:top;width:130px;">${escapeHtml(label)}</td>
        <td style="padding:10px 0 10px 18px;border-bottom:1px solid #dce8e6;color:#12333a;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#edf5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 14px;background:#edf5f2;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;overflow:hidden;border:1px solid #cdded9;border-radius:20px;background:#fffdf7;box-shadow:0 16px 40px rgba(0,47,50,.12);">
          <tr><td style="padding:26px 30px;background:#063b3d;color:#fff;">
            <p style="margin:0 0 7px;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#bef264;">New private transfer</p>
            <h1 style="margin:0;font-size:25px;line-height:1.2;">${escapeHtml(detail.requestReference)}</h1>
          </td></tr>
          <tr><td style="padding:20px 30px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${htmlRows}</table></td></tr>
          <tr><td style="padding:20px 30px 28px;">
            <a href="${requestUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0a6664;color:#fff;text-decoration:none;font-size:13px;font-weight:800;">Open reservation</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    `New private transfer: ${detail.requestReference}`,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    requestUrl,
  ].join("\n");

  const deliveries: Promise<unknown>[] = [getTransporter().sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: RESERVATION_NOTIFICATION_EMAIL,
    replyTo: detail.passengerEmail || undefined,
    subject: `New taxi reservation ${detail.requestReference}`,
    html,
    text,
  })];

  if (detail.passengerEmail) {
    const travelerRows = rows.filter(([label]) => !["Passenger email", "Passenger"].includes(label));
    const travelerHtmlRows = travelerRows
      .map(
        ([label, value]) => `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #dce8e6;color:#687775;font-size:12px;vertical-align:top;width:130px;">${escapeHtml(label)}</td>
          <td style="padding:10px 0 10px 18px;border-bottom:1px solid #dce8e6;color:#12333a;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
        </tr>`
      )
      .join("");
    const travelerHtml = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#edf5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 14px;background:#edf5f2;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;overflow:hidden;border:1px solid #cdded9;border-radius:20px;background:#fff;box-shadow:0 16px 40px rgba(0,47,50,.12);">
          <tr><td style="padding:26px 30px;background:#063b3d;color:#fff;">
            <p style="margin:0 0 7px;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#bfe8e3;">Taxi booking received</p>
            <h1 style="margin:0;font-size:25px;line-height:1.2;">${escapeHtml(detail.requestReference)}</h1>
          </td></tr>
          <tr><td style="padding:24px 30px 8px;color:#12333a;font-size:14px;line-height:1.6;">We received your taxi booking. Keep this reference for your records.</td></tr>
          <tr><td style="padding:8px 30px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${travelerHtmlRows}</table></td></tr>
          <tr><td style="padding:20px 30px 28px;"><a href="${requestUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0a6664;color:#fff;text-decoration:none;font-size:13px;font-weight:800;">View booking</a></td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
    const travelerText = [
      `Taxi booking received: ${detail.requestReference}`,
      "",
      ...travelerRows.map(([label, value]) => `${label}: ${value}`),
      "",
      requestUrl,
    ].join("\n");

    deliveries.push(getTransporter().sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: detail.passengerEmail,
      subject: `Taxi booking received ${detail.requestReference}`,
      html: travelerHtml,
      text: travelerText,
    }));
  }

  const results = await Promise.allSettled(deliveries);
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    throw new AggregateError(failures, "One or more taxi booking emails could not be sent");
  }
}
