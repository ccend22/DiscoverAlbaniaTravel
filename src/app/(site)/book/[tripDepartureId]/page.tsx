import { notFound } from "next/navigation";
import Link from "next/link";
import { getTripDepartureById, isDepartureValidOnDate } from "@/db/queries/trips";
import { formatDuration, formatPrice, formatWeekdays, formatDateLong } from "@/lib/format";
import { getActiveUserSessionId } from "@/lib/user-session";
import { getUserById } from "@/db/queries/users";
import { CheckCircleIcon, ClockIcon, MapPinIcon } from "@/components/icons";
import { createBookingAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/dictionary";

interface BookPageProps {
  params: Promise<{ tripDepartureId: string }>;
  searchParams: Promise<{ date?: string; error?: string; seats?: string }>;
}

function CheckoutSteps({ current, steps }: { current: number; steps: readonly string[] }) {
  return (
    <ol className="mb-8 flex items-center gap-2 overflow-x-auto pb-1 text-sm">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isDone = stepNumber < current;
        const isCurrent = stepNumber === current;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-[var(--dur-base)] ease-[var(--ease-spring)] ${
                isDone
                  ? "bg-success text-white"
                  : isCurrent
                    ? "bg-brand text-brand-foreground shadow-[var(--shadow-glow-teal)]"
                    : "bg-surface-sunken text-muted"
              }`}
            >
              {isDone ? <CheckCircleIcon width={14} height={14} /> : stepNumber}
            </span>
            <span className={`whitespace-nowrap transition-colors duration-[var(--dur-base)] ${isCurrent ? "font-medium text-foreground" : "text-muted"}`}>
              {step}
            </span>
            {stepNumber < steps.length && <span className="mx-1 h-px w-6 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

export default async function BookPage({ params, searchParams }: BookPageProps) {
  const { tripDepartureId } = await params;
  const { date, error, seats } = await searchParams;
  const { locale, dict } = await getLocaleAndDictionary();
  const bp = dict.bookPage;

  const id = Number(tripDepartureId);
  if (!Number.isInteger(id)) notFound();

  const trip = await getTripDepartureById(id);
  if (!trip) notFound();

  const dateIsValid = date ? await isDepartureValidOnDate(id, date) : false;
  const defaultSeats = Math.min(Math.max(Number(seats) || 1, 1), 9);

  const userId = await getActiveUserSessionId();
  const profile = userId ? await getUserById(userId) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <CheckoutSteps current={dateIsValid && date ? 2 : 1} steps={bp.steps} />

      {!date || !dateIsValid ? (
        <Alert tone="warning">
          <p>
            {!date
              ? bp.noDateSelected
              : formatMessage(bp.doesntRunOn, { date: formatDateLong(date, locale) })}{" "}
            <Link href="/" className="underline">
              {bp.startNewSearch}
            </Link>{" "}
            {bp.andChooseDate}
          </p>
        </Alert>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
          <div>
            <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.1em] text-teal">{bp.busReservation}</p>
            <h1 className="mt-2 animate-fade-up font-display text-2xl font-bold text-foreground [animation-delay:60ms]">{bp.passengerDetailsHeading}</h1>
            <p className="mt-1 text-sm text-muted">{formatMessage(bp.travelingOn, { date: formatDateLong(date, locale) })}</p>

            {error && (
              <div className="mt-4">
                <Alert tone="error">{error}</Alert>
              </div>
            )}

            {profile && (
              <div className="mt-4">
                <Alert tone="success">
                  {formatMessage(bp.bookingAs, { name: profile.name, email: profile.email })}
                </Alert>
              </div>
            )}

            <form action={createBookingAction} className="mt-6 flex flex-col gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
              <input type="hidden" name="tripDepartureId" value={id} />
              <input type="hidden" name="travelDate" value={date} />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                  <span className="font-medium text-foreground">{bp.fullName}</span>
                  <input
                    name="passengerName"
                    required
                    defaultValue={profile?.name}
                    className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-foreground">{bp.phone}</span>
                  <input
                    name="passengerPhone"
                    required
                    type="tel"
                    defaultValue={profile?.phone ?? undefined}
                    className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-foreground">{bp.email}</span>
                  <input
                    name="passengerEmail"
                    required
                    type="email"
                    defaultValue={profile?.email}
                    className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-foreground">{bp.seats}</span>
                  <input
                    name="seats"
                    required
                    type="number"
                    min={1}
                    max={9}
                    defaultValue={defaultSeats}
                    className="w-24 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
                  />
                </label>
              </div>

              <Button type="submit" className="mt-2">
                {bp.confirmReservation}
              </Button>
              <p className="text-xs text-muted">
                {bp.paymentNote}
              </p>
            </form>

            <section className="mt-10 border-t border-border pt-6">
              <h2 className="text-sm font-semibold text-foreground">{bp.goodToKnow}</h2>
              <dl className="mt-3 flex flex-col gap-3 text-sm text-muted">
                <div>
                  <dt className="font-medium text-foreground">{bp.luggage}</dt>
                  <dd>
                    {formatMessage(bp.luggageBody, { operator: trip.operatorName })}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">{bp.changesCancellations}</dt>
                  <dd>
                    {bp.changesCancellationsPrefix}{" "}
                    <Link href="/account" className="text-teal underline">
                      {bp.myAccountLink}
                    </Link>
                    {bp.changesCancellationsMiddle}{" "}
                    <Link href="/booking" className="text-teal underline">
                      {bp.myBookingLink}
                    </Link>
                    .
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <aside className="rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-md)] lg:sticky lg:top-24">
            <p className="text-xs font-semibold uppercase text-muted">
              {bp.tripSummary}
            </p>
            <div className="mt-3 flex items-start gap-2">
              <MapPinIcon width={16} height={16} className="mt-0.5 shrink-0 text-teal" />
              <div className="text-sm">
                <p className="font-medium text-foreground">{trip.fromStationName}</p>
                <p className="tabular-nums text-muted">{trip.departureTime}</p>
              </div>
            </div>
            <div className="ml-2 my-1 h-4 border-l border-dashed border-border" />
            <div className="flex items-start gap-2">
              <MapPinIcon width={16} height={16} className="mt-0.5 shrink-0 text-brand" />
              <div className="text-sm">
                <p className="font-medium text-foreground">{trip.toStationName}</p>
                <p className="tabular-nums text-muted">{trip.arrivalTime}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted">
              <ClockIcon width={14} height={14} />
              {formatDuration(trip.durationMin, locale)} · {formatMessage(bp.runsWeekdays, { weekdays: formatWeekdays(trip.weekdays, locale) })}
            </div>

            <div className="mt-4 border-t border-border pt-4 text-sm">
              <p className="text-foreground">{trip.operatorName}</p>
              <p className="text-muted">{formatMessage(bp.routeLabel, { code: trip.routeCode })}</p>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">{bp.pricePerSeat}</span>
                <span className="font-medium text-foreground">
                  {formatPrice(trip.basePrice)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted">{bp.seats}</span>
                <span className="font-medium text-foreground">{defaultSeats}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold text-foreground">{bp.total}</span>
                <span className="text-lg font-semibold text-foreground">
                  {formatPrice(trip.basePrice, defaultSeats)}
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
