import QRCode from "qrcode";
import { createTicketQrPayload } from "@/lib/ticket-code";

interface TicketQrProps {
  ticketToken: string;
  bookingReference: string;
  locale?: "en" | "al";
}

export async function TicketQr({ ticketToken, bookingReference, locale = "en" }: TicketQrProps) {
  const svg = await QRCode.toString(createTicketQrPayload(ticketToken), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 224,
    color: { dark: "#12333a", light: "#ffffff" },
  });

  const label = locale === "al" ? "Kodi QR i biletës" : "Ticket QR code";
  const instruction = locale === "al"
    ? "Paraqite këtë kod gjatë hipjes. Çdo biletë mund të validohet vetëm një herë."
    : "Show this code when boarding. Each ticket can be validated only once.";

  return (
    <div className="flex flex-col items-center text-center">
      <div
        role="img"
        aria-label={`${label} ${bookingReference}`}
        className="w-56 overflow-hidden rounded-xl bg-white [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
        // The SVG is generated locally by qrcode from an opaque server-issued token.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted print:text-black">{instruction}</p>
    </div>
  );
}
