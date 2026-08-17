import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUserSession } from "@/lib/user-session";
import { getUserById } from "@/db/queries/users";
import { getBookingsForUser, type BookingDetail } from "@/db/queries/bookings";
import { listTaxiRequestsForUser } from "@/db/queries/taxi";
import { formatCurrency, formatPrice, formatDateLong, formatTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { TicketIcon, MapPinIcon, CalendarIcon, ClockIcon } from "@/components/icons";
import { cancelBookingAction, cancelTaxiRequestAction, logoutUserAction, updateProfileAction } from "./actions";
import { formatAlbaniaDateTime } from "@/lib/timezone";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { formatMessage, type Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

interface AccountPageProps {
  searchParams: Promise<{ cancelled?: string; taxiCancelled?: string; error?: string; saved?: string }>;
}

function BookingRow({ booking, showCancel, dict, locale }: { booking: BookingDetail; showCancel: boolean; dict: Dictionary; locale: Locale }) {
  const ap = dict.accountPage;
  // A booking is "confirmed" the instant it's reserved, before its payment
  // resolves (see src/db/queries/payments.ts) -- so the badge and the
  // available actions both need payment status, not just booking status.
  const isPaid = booking.status === "confirmed" && booking.paymentStatus === "paid";
  const isPending = booking.status === "confirmed" && !isPaid;

  return (
    <article className="public-card card-lift flex flex-col gap-4 p-5 hover:border-teal/30 sm:flex-row sm:items-stretch sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge tone={isPaid ? "success" : isPending ? "warning" : "danger"}>
            {isPaid ? ap.confirmed : isPending ? ap.paymentPending : ap.cancelledStatus}
          </Badge>
          <span className="font-mono text-xs text-muted">{booking.bookingReference}</span>
        </div>
        <p className="flex items-center gap-1.5 text-lg font-medium text-foreground">
          <MapPinIcon width={16} height={16} className="shrink-0 text-coral" />
          {booking.trip.fromStationName} → {booking.trip.toStationName}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <CalendarIcon width={14} height={14} />
            {formatDateLong(booking.travelDate, locale)}
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon width={14} height={14} />
            {formatTime(booking.trip.departureTime)}
          </span>
          <span>
            {booking.seats} {booking.seats > 1 ? ap.seats : ap.seat} · {formatPrice(booking.priceAtBooking, booking.seats)}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--page-line)] pt-4 sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:pt-0">
        <Link
          href={`/booking/${booking.bookingReference}`}
          className="flex items-center gap-1.5 rounded-full border border-[var(--page-line)] bg-white px-4 py-2 text-sm font-medium text-foreground transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:border-teal hover:text-teal hover:shadow-[var(--shadow-xs)]"
        >
          <TicketIcon width={16} height={16} />
          {ap.viewTicket}
        </Link>
        {showCancel && booking.status === "confirmed" && (
          isPaid ? (
            <span className="text-xs text-muted">{ap.contactToCancel}</span>
          ) : (
            <form action={cancelBookingAction}>
              <input type="hidden" name="reference" value={booking.bookingReference} />
              <Button variant="danger" size="sm">{ap.cancel}</Button>
            </form>
          )
        )}
      </div>
    </article>
  );
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const userId = await requireUserSession();
  const [profile, bookings, taxiRequests, params, { locale, dict }] = await Promise.all([
    getUserById(userId),
    getBookingsForUser(userId),
    listTaxiRequestsForUser(userId),
    searchParams,
    getLocaleAndDictionary(),
  ]);
  const ap = dict.accountPage;

  if (!profile) redirect("/account/login");

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.travelDate >= today && b.status === "confirmed");
  const past = bookings.filter((b) => b.travelDate < today || b.status === "cancelled");
  const taxiStatusLabel: Record<string, string> = {
    requested: ap.taxiStatusRequested,
    accepted: ap.taxiStatusAccepted,
    declined: ap.taxiStatusDeclined,
    cancelled: ap.taxiStatusCancelled,
    completed: ap.taxiStatusCompleted,
  };

  return (
    <div className="public-page mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex animate-fade-up flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal">{ap.kicker}</p>
          <h1 className="mt-2 font-display text-4xl font-black tracking-[-0.035em] text-brand-navy">{formatMessage(ap.greeting, { name: profile.name })}</h1>
          <p className="mt-1 text-sm text-muted">{profile.email}</p>
        </div>
        <form action={logoutUserAction}>
          <Button variant="outline">{ap.signOut}</Button>
        </form>
      </div>

      {params.cancelled && (
        <div className="mt-6">
          <Alert tone="success">{ap.bookingCancelled}</Alert>
        </div>
      )}
      {params.saved && (
        <div className="mt-6">
          <Alert tone="success">{ap.profileUpdated}</Alert>
        </div>
      )}
      {params.taxiCancelled && (
        <div className="mt-6">
          <Alert tone="success">{ap.taxiCancelled}</Alert>
        </div>
      )}
      {params.error && (
        <div className="mt-6">
          <Alert tone="error">{params.error}</Alert>
        </div>
      )}

      <section className="py-8">
        <h2 className="font-display text-2xl font-black text-brand-navy">{ap.upcomingTrips}</h2>
        {upcoming.length === 0 ? (
          <div className="public-card mt-4 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-muted">
              <TicketIcon width={18} height={18} className="shrink-0" />
              {ap.noUpcoming}
            </p>
            <LinkButton href="/" variant="outline" size="sm">{ap.noUpcomingCta}</LinkButton>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {upcoming.map((booking) => (
              <BookingRow key={booking.bookingReference} booking={booking} showCancel dict={dict} locale={locale} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="border-t border-border py-8">
          <h2 className="font-display text-2xl font-black text-brand-navy">{ap.pastCancelled}</h2>
          <div className="mt-4 flex flex-col gap-3">
            {past.map((booking) => (
              <BookingRow key={booking.bookingReference} booking={booking} showCancel={false} dict={dict} locale={locale} />
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-border py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-black text-brand-navy">{ap.taxiRequestsTitle}</h2>
            <p className="mt-1 text-sm text-muted">{ap.taxiRequestsSubtitle}</p>
          </div>
          <Link
            href="/?tab=taxi#search"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--page-line)] bg-white px-4 py-2 text-sm font-medium text-foreground transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:border-teal hover:text-teal hover:shadow-[var(--shadow-xs)]"
          >
            {ap.requestTaxi}
          </Link>
        </div>
        {taxiRequests.length === 0 ? (
          <div className="public-card mt-4 flex items-center gap-2 p-6 text-sm text-muted">
            <MapPinIcon width={18} height={18} className="shrink-0" />
            {ap.noTaxiRequests}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {taxiRequests.map((request) => (
              <article key={request.id} className="public-card card-lift flex flex-col gap-4 p-5 hover:border-teal/30 sm:flex-row sm:items-stretch sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={request.status === "accepted" || request.status === "completed" ? "success" : request.status === "cancelled" || request.status === "declined" ? "danger" : "warning"}>
                      {taxiStatusLabel[request.status] ?? request.status}
                    </Badge>
                    <span className="font-mono text-xs text-muted">{request.requestReference}</span>
                  </div>
                  <p className="flex items-center gap-1.5 text-lg font-medium text-foreground">
                    <MapPinIcon width={16} height={16} className="shrink-0 text-coral" />
                    {request.pickupLocation} → {request.destination}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-muted">
                    <ClockIcon width={14} height={14} />
                    {formatAlbaniaDateTime(request.pickupAt, locale)}{request.providerName ? ` · ${request.providerName}` : ""}{request.quotedPrice ? ` · ${formatCurrency(request.quotedPrice)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--page-line)] pt-4 sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:pt-0">
                  <Link
                    href={`/account/taxi/${request.requestReference}`}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--page-line)] bg-white px-4 py-2 text-sm font-medium text-foreground transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:border-teal hover:text-teal hover:shadow-[var(--shadow-xs)]"
                  >
                    {ap.view}
                  </Link>
                  {(request.status === "requested" || request.status === "accepted") && (
                    <form action={cancelTaxiRequestAction}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <Button variant="danger" size="sm">{ap.cancel}</Button>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-border py-8">
        <h2 className="font-display text-2xl font-black text-brand-navy">{ap.profileSettings}</h2>
        <form
          action={updateProfileAction}
          className="public-card mt-5 grid gap-5 p-6 sm:grid-cols-2 sm:p-8"
        >
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-foreground">{ap.fullName}</span>
            <input
              name="name"
              required
              defaultValue={profile.name}
              className="public-input min-h-13 rounded-2xl px-4 py-3"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{ap.email}</span>
            <input
              value={profile.email}
              disabled
              className="min-h-13 rounded-2xl border border-[var(--page-line)] bg-surface-sunken px-4 py-3 text-muted"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{ap.phone}</span>
            <input
              name="phone"
              defaultValue={profile.phone ?? ""}
              className="public-input min-h-13 rounded-2xl px-4 py-3"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">{ap.saveChanges}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
