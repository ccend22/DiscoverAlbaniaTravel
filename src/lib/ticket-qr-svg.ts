import QRCode from "qrcode";
import { createTicketQrPayload } from "@/lib/ticket-code";

export function generateTicketQrSvg(ticketToken: string): Promise<string> {
  return QRCode.toString(createTicketQrPayload(ticketToken), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 224,
    color: { dark: "#12333a", light: "#ffffff" },
  });
}
