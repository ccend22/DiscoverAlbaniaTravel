import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { getTaxiRequestForUser } from "@/db/queries/taxi";
import { requireUserSession } from "@/lib/user-session";
import { formatAlbaniaDateTime } from "@/lib/timezone";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/dictionary";

export default async function AccountTaxiRequestPage({ params }: { params: Promise<{ reference: string }> }) {
  const userId = await requireUserSession();
  const { reference } = await params;
  const request = await getTaxiRequestForUser(userId, reference.toUpperCase());
  if (!request) notFound();
  const { locale, dict } = await getLocaleAndDictionary();
  const atr = dict.accountTaxiRequest;
  const tone = request.status === "accepted" || request.status === "completed" ? "success" : request.status === "cancelled" || request.status === "declined" ? "danger" : "warning";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/account" className="text-sm text-teal hover:underline">{atr.backToAccount}</Link>
      <div className="mt-6 flex animate-fade-up flex-wrap items-center gap-3"><h1 className="font-display text-2xl font-bold">{atr.taxiRequest}</h1><Badge tone={tone}>{request.status}</Badge><span className="font-mono text-sm text-muted">{request.requestReference}</span></div>
      <dl className="mt-6 grid animate-fade-up gap-5 rounded-md border border-border bg-surface p-6 shadow-[var(--shadow-sm)] [animation-delay:60ms] sm:grid-cols-2">
        <div><dt className="text-xs uppercase text-muted">{atr.journey}</dt><dd className="mt-1 font-medium">{request.pickupLocation} to {request.destination}</dd></div>
        <div><dt className="text-xs uppercase text-muted">{atr.pickup}</dt><dd className="mt-1 font-medium">{formatAlbaniaDateTime(request.pickupAt, locale)}</dd></div>
        <div><dt className="text-xs uppercase text-muted">{atr.passenger}</dt><dd className="mt-1 font-medium">{[request.passengerName, `${request.passengers} ${request.passengers === 1 ? dict.accountPage.seat : dict.accountPage.seats}`].filter(Boolean).join(" · ")}</dd><dd className="text-sm text-muted">{[request.passengerPhone, request.passengerEmail].filter(Boolean).join(" · ")}</dd></div>
        <div><dt className="text-xs uppercase text-muted">{atr.confirmationAndPrice}</dt><dd className="mt-1 font-medium">{request.quotedPrice ? formatCurrency(request.quotedPrice) : atr.waitingForReview}</dd></div>
        {(request.vehicleMake || request.notes || request.driverName) && <div className="sm:col-span-2"><dt className="text-xs uppercase text-muted">{atr.details}</dt>{request.driverName && <dd className="mt-1">{formatMessage(atr.driverContact, { name: request.driverName })}</dd>}{request.vehicleMake && <dd className="mt-1">{formatMessage(atr.vehicle, { make: request.vehicleMake, model: request.vehicleModel ?? "", plate: request.plateNumber ?? "" })}</dd>}{request.notes && <dd className="mt-1 text-sm text-muted">{formatMessage(atr.yourNote, { notes: request.notes })}</dd>}</div>}
      </dl>
    </main>
  );
}
