import Link from "next/link";
import { getBookingForManage } from "@/db/queries/bookings";
import { formatDateLong, formatPrice, formatTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { MapPinIcon, AlertCircleIcon } from "@/components/icons";
import { cancelBookingByTokenAction, updatePassengerDetailsAction } from "./actions";
import { getLocaleAndDictionary } from "@/lib/i18n";

interface ManageBookingPageProps {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ token?: string; saved?: string; cancelled?: string; error?: string }>;
}

export default async function ManageBookingPage({ params, searchParams }: ManageBookingPageProps) {
  const [{ reference }, { token, saved, cancelled, error }, { dict, locale }] = await Promise.all([
    params,
    searchParams,
    getLocaleAndDictionary(),
  ]);
  const bm = dict.bookingManage;
  const bc = dict.bookingConfirmation;

  const booking = token ? await getBookingForManage(reference.toUpperCase(), token) : null;

  if (!booking) {
    return (
      <div className="public-page mx-auto max-w-lg px-4 py-16 sm:px-6 sm:py-20">
        <p className="animate-fade-up text-[11px] font-black uppercase tracking-[0.2em] text-teal">{bm.kicker}</p>
        <h1 className="mt-3 animate-fade-up font-display text-4xl font-black tracking-[-0.035em] text-brand-navy [animation-delay:60ms]">{bm.title}</h1>
        <div className="public-card mt-8 flex animate-fade-up items-start gap-3 p-5 text-sm [animation-delay:120ms]">
          <AlertCircleIcon width={18} height={18} className="mt-0.5 shrink-0 text-warning" />
          <p>{bm.invalidLink}</p>
        </div>
        <Link
          href="/booking"
          className="mt-5 inline-flex items-center rounded-full border border-[var(--page-line)] bg-white px-4 py-2 text-sm font-medium text-foreground transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:border-teal hover:text-teal hover:shadow-[var(--shadow-xs)]"
        >
          {dict.bookingLookup.findBooking}
        </Link>
      </div>
    );
  }

  const isPaid = booking.status === "confirmed" && booking.paymentStatus === "paid";
  const isCancelled = booking.status === "cancelled";

  return (
    <div className="public-page mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="animate-fade-up text-[11px] font-black uppercase tracking-[0.2em] text-teal">{bm.kicker}</p>
      <h1 className="mt-3 animate-fade-up font-display text-4xl font-black tracking-[-0.035em] text-brand-navy [animation-delay:60ms]">{bm.title}</h1>

      {saved && (
        <div className="mt-6">
          <Alert tone="success">{bm.savedNotice}</Alert>
        </div>
      )}
      {cancelled && (
        <div className="mt-6">
          <Alert tone="success">{bm.cancelledNotice}</Alert>
        </div>
      )}
      {error && (
        <div className="mt-6">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="public-card mt-8 animate-fade-up p-6 [animation-delay:120ms] sm:p-8">
        <div className="flex items-center gap-2">
          <Badge tone={isCancelled ? "danger" : isPaid ? "success" : "warning"}>
            {isCancelled ? bc.cancelled : isPaid ? bc.confirmed : bc.paymentPending}
          </Badge>
          <span className="font-mono text-xs text-muted">{booking.bookingReference}</span>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-lg font-medium text-foreground">
          <MapPinIcon width={16} height={16} className="shrink-0 text-coral" />
          {booking.trip.fromStationName} → {booking.trip.toStationName}
        </p>
        <p className="mt-1 text-sm text-muted">
          {formatDateLong(booking.travelDate, locale)} · {formatTime(booking.trip.departureTime)} ·{" "}
          {booking.seats} {booking.seats > 1 ? dict.accountPage.seats : dict.accountPage.seat} ·{" "}
          {formatPrice(booking.priceAtBooking, booking.seats, locale)}
        </p>
      </div>

      {!isCancelled && (
        <div className="public-card mt-5 animate-fade-up p-6 [animation-delay:160ms] sm:p-8">
          <h2 className="font-display text-xl font-black text-brand-navy">{bm.editTitle}</h2>
          <p className="mt-1 text-sm text-muted">{bm.editSubtitle}</p>
          <form action={updatePassengerDetailsAction} className="mt-5 grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="reference" value={booking.bookingReference} />
            <input type="hidden" name="token" value={token} />
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-foreground">{bm.fullName}</span>
              <input name="passengerName" required defaultValue={booking.passengerName} className="public-input min-h-13 rounded-2xl px-4 py-3" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">{bm.email}</span>
              <input name="passengerEmail" type="email" required defaultValue={booking.passengerEmail ?? ""} className="public-input min-h-13 rounded-2xl px-4 py-3" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">{bm.phone}</span>
              <input name="passengerPhone" required defaultValue={booking.passengerPhone} className="public-input min-h-13 rounded-2xl px-4 py-3" />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit">{bm.saveChanges}</Button>
            </div>
          </form>
        </div>
      )}

      {!isCancelled && (
        <div className="public-card mt-5 animate-fade-up p-6 [animation-delay:200ms] sm:p-8">
          <h2 className="font-display text-xl font-black text-brand-navy">{bm.cancelTitle}</h2>
          <p className="mt-1 text-sm text-muted">{bm.cancelSubtitle}</p>
          <div className="mt-5">
            {isPaid ? (
              <p className="text-sm text-muted">{bm.contactToCancel}</p>
            ) : (
              <form action={cancelBookingByTokenAction}>
                <input type="hidden" name="reference" value={booking.bookingReference} />
                <input type="hidden" name="token" value={token} />
                <Button variant="danger" type="submit">{bm.cancelBooking}</Button>
              </form>
            )}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="public-card mt-5 animate-fade-up p-6 text-sm text-muted [animation-delay:160ms] sm:p-8">
          {bm.alreadyCancelled}
        </div>
      )}
    </div>
  );
}
