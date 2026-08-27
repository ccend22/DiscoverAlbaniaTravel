import Link from "next/link";
import { notFound } from "next/navigation";
import { getTaxiRideRequestByReference } from "@/db/queries/taxi";
import { formatAlbaniaDateTime } from "@/lib/timezone";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { CheckCircleIcon, ClockIcon, XCircleIcon } from "@/components/icons";

function formatTaxiFare(amount: string, currency: string): string {
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(amount));
  return `${currency === "EUR" ? "€" : ""}${formatted}${currency === "ALL" ? " ALL" : ""}`;
}

export default async function TaxiRequestConfirmation({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const request = await getTaxiRideRequestByReference(reference.toUpperCase());
  if (!request) notFound();
  const { locale, dict } = await getLocaleAndDictionary();
  const tc = dict.taxiRequestConfirmation;
  const bc = dict.bookingConfirmation;
  const ap = dict.accountPage;
  const statusLabels: Record<string, string> = {
    requested: ap.taxiStatusRequested,
    accepted: ap.taxiStatusAccepted,
    declined: ap.taxiStatusDeclined,
    completed: ap.taxiStatusCompleted,
    cancelled: ap.taxiStatusCancelled,
  };

  const isCancelled = request.status === "cancelled";
  const paymentArrivedAfterCancellation = isCancelled && request.paymentStatus === "paid";
  const isPaid = !isCancelled && request.paymentStatus === "paid";
  const isPending = !isPaid && !isCancelled;
  const panelTone = isPaid
    ? "border-success/25 bg-success-soft"
    : isPending
      ? "border-warning/25 bg-warning-soft"
      : "border-coral/25 bg-coral-soft";
  const panelAccent = isPaid ? "text-success" : isPending ? "text-warning" : "text-coral";
  const panelTitle = isPaid ? tc.reviewing : isPending ? bc.paymentPending : bc.cancelled;
  const panelBody = isPaid
    ? tc.teamWillContact
    : isPending
      ? bc.paymentPendingNote
      : paymentArrivedAfterCancellation
        ? bc.paidCancelledNote
        : bc.paymentFailedNote;

  return (
    <main className="public-page mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-4 flex animate-fade-up items-center">
        <Badge tone={isPaid ? "success" : isPending ? "warning" : "danger"} className="px-3 py-1 text-sm">
          {isPaid ? <CheckCircleIcon width={14} height={14} /> : isPending ? <ClockIcon width={14} height={14} /> : <XCircleIcon width={14} height={14} />}
          {isPaid ? bc.confirmed : isPending ? bc.paymentPending : bc.cancelled}
        </Badge>
      </div>

      <div className={`rounded-[2.5rem] border p-7 shadow-[0_18px_45px_rgba(7,52,60,0.08)] sm:p-10 ${panelTone}`}>
        <p className={`text-sm font-semibold ${panelAccent}`}>{isPaid ? tc.received : tc.status}</p>
        <h1 className="mt-3 font-display text-4xl font-black tracking-[-0.035em] text-brand-navy">{panelTitle}</h1>
        <p className="mt-3 text-muted">
          {panelBody}{" "}
          <span className="font-mono font-semibold text-foreground">{request.requestReference}</span>.
        </p>
      </div>
      <dl className="public-card mt-6 grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
        <div><dt className="text-xs uppercase text-muted">{tc.journey}</dt><dd className="mt-1 font-medium text-foreground">{request.pickupLocation} to {request.destination}</dd></div>
        <div><dt className="text-xs uppercase text-muted">{tc.pickup}</dt><dd className="mt-1 font-medium text-foreground">{formatAlbaniaDateTime(request.pickupAt, locale)}</dd></div>
        {request.exactPickupPoint && (
          <div><dt className="text-xs uppercase text-muted">{tc.exactPickupPoint}</dt><dd className="mt-1 font-medium text-foreground">{request.exactPickupPoint}</dd></div>
        )}
        <div><dt className="text-xs uppercase text-muted">{tc.passengers}</dt><dd className="mt-1 font-medium text-foreground">{request.passengers}</dd></div>
        <div><dt className="text-xs uppercase text-muted">{tc.status}</dt><dd className="mt-1 font-medium text-foreground">{statusLabels[request.status] ?? request.status}</dd></div>
        {request.paymentAmount && request.paymentCurrency && (
          <div><dt className="text-xs uppercase text-muted">{bc.totalPrice}</dt><dd className="mt-1 font-medium text-foreground">{formatTaxiFare(request.paymentAmount, request.paymentCurrency)}</dd></div>
        )}
        {request.preferredTaxiCompany && (
          <div><dt className="text-xs uppercase text-muted">{tc.preferredCompany}</dt><dd className="mt-1 font-medium text-foreground">{request.preferredTaxiCompany}</dd></div>
        )}
        {request.notes && (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase text-muted">{tc.note}</dt>
            <dd className="mt-1 font-medium text-foreground">{request.notes}</dd>
          </div>
        )}
      </dl>
      <Link href="/" className="mt-6 inline-flex text-sm font-medium text-teal hover:underline">{tc.returnToSearch}</Link>
    </main>
  );
}
