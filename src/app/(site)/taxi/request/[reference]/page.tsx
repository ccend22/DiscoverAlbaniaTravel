import Link from "next/link";
import { notFound } from "next/navigation";
import { getTaxiRideRequestByReference } from "@/db/queries/taxi";
import { formatDateLong } from "@/lib/format";
import { getLocaleAndDictionary } from "@/lib/i18n";

export default async function TaxiRequestConfirmation({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const request = await getTaxiRideRequestByReference(reference.toUpperCase());
  if (!request) notFound();
  const { locale, dict } = await getLocaleAndDictionary();
  const tc = dict.taxiRequestConfirmation;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="rounded-md border border-success/30 bg-success-soft p-5 sm:p-6">
        <p className="text-sm font-semibold text-success">{tc.received}</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground">{tc.reviewing}</h1>
        <p className="mt-3 text-muted">
          {tc.teamWillContact}{" "}
          <span className="font-mono font-semibold text-foreground">{request.requestReference}</span>.
        </p>
      </div>
      <dl className="mt-6 grid gap-4 rounded-md border border-border bg-surface p-5 sm:grid-cols-2 sm:p-6">
        <div><dt className="text-xs uppercase text-muted">{tc.journey}</dt><dd className="mt-1 font-medium text-foreground">{request.pickupLocation} to {request.destination}</dd></div>
        <div><dt className="text-xs uppercase text-muted">{tc.pickup}</dt><dd className="mt-1 font-medium text-foreground">{formatDateLong(request.pickupAt.toISOString().slice(0, 10), locale)} at {request.pickupAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</dd></div>
        <div><dt className="text-xs uppercase text-muted">{tc.passengers}</dt><dd className="mt-1 font-medium text-foreground">{request.passengers}</dd></div>
        <div><dt className="text-xs uppercase text-muted">{tc.status}</dt><dd className="mt-1 font-medium capitalize text-foreground">{request.status}</dd></div>
      </dl>
      <Link href="/" className="mt-6 inline-flex text-sm font-medium text-teal hover:underline">{tc.returnToSearch}</Link>
    </main>
  );
}
