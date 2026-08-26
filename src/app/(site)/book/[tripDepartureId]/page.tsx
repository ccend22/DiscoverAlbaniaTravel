import { notFound } from "next/navigation";
import Link from "next/link";
import { getTripDepartureById, isDepartureValidOnDate } from "@/db/queries/trips";
import { formatDuration, formatPrice, formatWeekdays, formatDateLong, formatTime } from "@/lib/format";
import { getActiveUserSessionId } from "@/lib/user-session";
import { getUserById } from "@/db/queries/users";
import { CheckCircleIcon, ClockIcon, MapPinIcon } from "@/components/icons";
import { BookingForm } from "./booking-form";
import { Alert } from "@/components/ui/alert";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/dictionary";
import { BUS_BOOKING_SERVICE_FEE_EUR } from "@/lib/service-fees";

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
  const priceUnavailable = trip.basePrice === null;
  const defaultSeats = Math.min(Math.max(Number(seats) || 1, 1), 9);

  const userId = await getActiveUserSessionId();
  const profile = userId ? await getUserById(userId) : null;

  return (
    <div className="public-page mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
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
      ) : priceUnavailable ? (
        <Alert tone="warning">
          <p>{bp.onlineBookingUnavailable}</p>
        </Alert>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="lg:col-span-2">
            <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.1em] text-teal">{bp.busReservation}</p>
            <h1 className="mt-2 animate-fade-up font-display text-4xl font-black tracking-[-0.035em] text-brand-navy [animation-delay:60ms]">{bp.passengerDetailsHeading}</h1>
            <p className="mt-1 text-sm text-muted">{formatMessage(bp.travelingOn, { date: formatDateLong(date, locale) })}</p>
          </div>

          <div>
            {error && (
              <Alert tone="error" className="mb-4">{error}</Alert>
            )}

            {profile && (
              <Alert tone="success" className="mb-4">
                {formatMessage(bp.bookingAs, { name: profile.name, email: profile.email })}
              </Alert>
            )}

            <BookingForm
              tripDepartureId={id}
              date={date}
              defaultSeats={defaultSeats}
              pricePerSeat={trip.basePrice ?? "0"}
              profile={profile ? { name: profile.name, email: profile.email, phone: profile.phone } : null}
              bp={bp}
              common={dict.common}
            />

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

          <aside className="public-card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase text-muted">
              {bp.tripSummary}
            </p>
            <div className="mt-3 flex items-start gap-2">
              <MapPinIcon width={16} height={16} className="mt-0.5 shrink-0 text-teal" />
              <div className="text-sm">
                <p className="font-medium text-foreground">{trip.fromStationName}</p>
                <p className="tabular-nums text-muted">{formatTime(trip.departureTime)}</p>
              </div>
            </div>
            <div className="ml-2 my-1 h-4 border-l border-dashed border-border" />
            <div className="flex items-start gap-2">
              <MapPinIcon width={16} height={16} className="mt-0.5 shrink-0 text-brand" />
              <div className="text-sm">
                <p className="font-medium text-foreground">{trip.toStationName}</p>
                <p className="tabular-nums text-muted">{formatTime(trip.arrivalTime)}</p>
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
                  {formatPrice(trip.basePrice, 1, locale)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted">{bp.seats}</span>
                <span className="font-medium text-foreground">{defaultSeats}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted">{dict.common.serviceFee}</span>
                <span className="font-medium text-foreground">+€{BUS_BOOKING_SERVICE_FEE_EUR.toFixed(2)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold text-foreground">{bp.total}</span>
                <span className="text-lg font-semibold text-foreground">
                  €{(Number(trip.basePrice) * defaultSeats + BUS_BOOKING_SERVICE_FEE_EUR).toFixed(2)}
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
