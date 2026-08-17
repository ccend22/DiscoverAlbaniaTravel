import Link from "next/link";
import { notFound } from "next/navigation";
import { getTaxiRideRequestByReference } from "@/db/queries/taxi";
import { formatAlbaniaDateTime } from "@/lib/timezone";
import { getLocaleAndDictionary } from "@/lib/i18n";

export default async function TaxiRequestConfirmation({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const request = await getTaxiRideRequestByReference(reference.toUpperCase());
  if (!request) notFound();
  const { locale, dict } = await getLocaleAndDictionary();
  const tc = dict.taxiRequestConfirmation;

  return (
    <main className="public-page mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-[2.5rem] border border-success/25 bg-success-soft p-7 shadow-[0_18px_45px_rgba(7,52,60,0.08)] sm:p-10">
        <p className="text-sm font-semibold text-success">{tc.received}</p>
        <h1 className="mt-3 font-display text-4xl font-black tracking-[-0.035em] text-brand-navy">{tc.reviewing}</h1>
        <p className="mt-3 text-muted">
          {tc.teamWillContact}{" "}
          <span className="font-mono font-semibold text-foreground">{request.requestReference}</span>.
        </p>
      </div>
      <dl className="public-card mt-6 grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
        <div><dt className="text-xs uppercase text-muted">{tc.journey}</dt><dd className="mt-1 font-medium text-foreground">{request.pickupLocation} to {request.destination}</dd></div>
        <div><dt className="text-xs uppercase text-muted">{tc.pickup}</dt><dd className="mt-1 font-medium text-foreground">{formatAlbaniaDateTime(request.pickupAt, locale)}</dd></div>
        <div><dt className="text-xs uppercase text-muted">{tc.passengers}</dt><dd className="mt-1 font-medium text-foreground">{request.passengers}</dd></div>
        <div><dt className="text-xs uppercase text-muted">{tc.status}</dt><dd className="mt-1 font-medium capitalize text-foreground">{request.status}</dd></div>
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
