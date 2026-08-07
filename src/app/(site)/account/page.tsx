import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUserSession } from "@/lib/user-session";
import { getUserById } from "@/db/queries/users";
import { getBookingsForUser, type BookingDetail } from "@/db/queries/bookings";
import { listTaxiRequestsForUser } from "@/db/queries/taxi";
import { formatCurrency, formatPrice, formatDateLong } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { TicketIcon } from "@/components/icons";
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
  return (
    <div className="card-lift flex flex-col gap-3 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Badge tone={booking.status === "confirmed" ? "success" : "danger"}>
            {booking.status === "confirmed" ? ap.confirmed : ap.cancelledStatus}
          </Badge>
          <span className="font-mono text-xs text-muted">{booking.bookingReference}</span>
        </div>
        <p className="mt-2 text-lg font-medium text-foreground">
          {booking.trip.fromStationName} → {booking.trip.toStationName}
        </p>
        <p className="text-sm text-muted">
          {formatDateLong(booking.travelDate, locale)} · {booking.trip.departureTime} ·{" "}
          {booking.seats} {booking.seats > 1 ? ap.seats : ap.seat} ·{" "}
          {formatPrice(booking.priceAtBooking, booking.seats)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={`/booking/${booking.bookingReference}`}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:border-teal hover:text-teal hover:shadow-[var(--shadow-xs)]"
        >
          <TicketIcon width={16} height={16} />
          {ap.viewTicket}
        </Link>
        {showCancel && booking.status === "confirmed" && (
          <form action={cancelBookingAction}>
            <input type="hidden" name="reference" value={booking.bookingReference} />
            <Button variant="danger" size="sm">{ap.cancel}</Button>
          </form>
        )}
      </div>
    </div>
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex animate-fade-up flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal">{ap.kicker}</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-foreground">{formatMessage(ap.greeting, { name: profile.name })}</h1>
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
        <h2 className="font-display text-lg font-semibold text-foreground">{ap.upcomingTrips}</h2>
        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{ap.noUpcoming}</p>
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
          <h2 className="font-display text-lg font-semibold text-foreground">{ap.pastCancelled}</h2>
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
            <h2 className="font-display text-lg font-semibold text-foreground">{ap.taxiRequestsTitle}</h2>
            <p className="mt-1 text-sm text-muted">{ap.taxiRequestsSubtitle}</p>
          </div>
          <Link href="/?tab=taxi#search" className="group shrink-0 text-sm font-medium text-teal">
            <span className="relative">
              {ap.requestTaxi}
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-teal transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
            </span>
          </Link>
        </div>
        {taxiRequests.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{ap.noTaxiRequests}</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {taxiRequests.map((request) => (
              <div key={request.id} className="card-lift flex flex-col gap-3 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={request.status === "accepted" || request.status === "completed" ? "success" : request.status === "cancelled" || request.status === "declined" ? "danger" : "warning"}>{request.status}</Badge>
                    <span className="font-mono text-xs text-muted">{request.requestReference}</span>
                  </div>
                  <p className="mt-2 font-medium text-foreground">{request.pickupLocation} to {request.destination}</p>
                  <p className="mt-1 text-sm text-muted">{formatAlbaniaDateTime(request.pickupAt, locale)}{request.providerName ? ` · ${request.providerName}` : ""}{request.quotedPrice ? ` · ${formatCurrency(request.quotedPrice)}` : ""}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/account/taxi/${request.requestReference}`} className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:border-teal hover:text-teal hover:shadow-[var(--shadow-xs)]">{ap.view}</Link>
                  {(request.status === "requested" || request.status === "accepted") && (
                    <form action={cancelTaxiRequestAction}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <Button variant="danger" size="sm">{ap.cancel}</Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-border py-8">
        <h2 className="font-display text-lg font-semibold text-foreground">{ap.profileSettings}</h2>
        <form
          action={updateProfileAction}
          className="mt-4 grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-2"
        >
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-foreground">{ap.fullName}</span>
            <input
              name="name"
              required
              defaultValue={profile.name}
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{ap.email}</span>
            <input
              value={profile.email}
              disabled
              className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-muted"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{ap.phone}</span>
            <input
              name="phone"
              defaultValue={profile.phone ?? ""}
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
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
