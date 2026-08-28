export class WhatsAppConfigError extends Error {}

const WHATSAPP_API_VERSION = "v21.0";
const TEMPLATE_NAME = "new_ticket";
const TEMPLATE_LANGUAGE_CODE = process.env.WHATSAPP_TEMPLATE_LANGUAGE_CODE || "en";

function getConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const notifyToRaw = process.env.WHATSAPP_NOTIFICATION_TO;
  if (!phoneNumberId || !accessToken || !notifyToRaw) {
    throw new WhatsAppConfigError(
      "WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN / WHATSAPP_NOTIFICATION_TO are not configured"
    );
  }
  // Comma-separated so more admins can be added later without a code change.
  const recipients = notifyToRaw.split(",").map((n) => n.trim()).filter(Boolean);
  if (recipients.length === 0) {
    throw new WhatsAppConfigError("WHATSAPP_NOTIFICATION_TO is set but contains no valid numbers");
  }
  return { phoneNumberId, accessToken, recipients };
}

export interface NewTicketWhatsAppDetail {
  passengerName: string;
  passengerPhone: string;
  routeLabel: string;
  departureAt: string;
  price: string;
  paid: boolean;
}

async function sendTemplateMessage(input: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  detail: NewTicketWhatsAppDetail;
}): Promise<void> {
  const response = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${input.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: TEMPLATE_NAME,
        language: { code: TEMPLATE_LANGUAGE_CODE },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: input.detail.passengerName },
              { type: "text", text: input.detail.passengerPhone },
              { type: "text", text: input.detail.routeLabel },
              { type: "text", text: input.detail.departureAt },
              { type: "text", text: input.detail.price },
              { type: "text", text: input.detail.paid ? "Yes" : "No" },
            ],
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`WhatsApp notification to ${input.to} failed (${response.status}): ${body}`);
  }
}

/**
 * Notifies every configured admin WhatsApp number (WHATSAPP_NOTIFICATION_TO,
 * comma-separated) the moment a bus reservation's payment settles as paid,
 * using the pre-approved "new_ticket" message template. Sends to all
 * recipients independently -- one failing (e.g. not yet added as a tester on
 * a dev-mode Meta app) never stops the others from going out. Best-effort:
 * callers must treat a thrown error here as non-fatal to the booking/payment
 * flow that triggered it.
 */
export async function sendNewTicketWhatsAppNotification(detail: NewTicketWhatsAppDetail): Promise<void> {
  const { phoneNumberId, accessToken, recipients } = getConfig();

  const results = await Promise.allSettled(
    recipients.map((to) => sendTemplateMessage({ phoneNumberId, accessToken, to, detail }))
  );
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((f) => f.reason),
      `${failures.length}/${recipients.length} WhatsApp notification(s) failed`
    );
  }
}
