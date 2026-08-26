export const TICKET_QR_PREFIX = "DAT1:";

export function createTicketQrPayload(ticketToken: string): string {
  return `${TICKET_QR_PREFIX}${ticketToken}`;
}

export function parseTicketQrPayload(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith(TICKET_QR_PREFIX)) return null;
  const token = trimmed.slice(TICKET_QR_PREFIX.length);
  return /^[A-Za-z0-9_-]{24,128}$/.test(token) ? token : null;
}
