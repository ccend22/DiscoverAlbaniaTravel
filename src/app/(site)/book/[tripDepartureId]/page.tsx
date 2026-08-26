import { notFound } from "next/navigation";
import Link from "next/link";
import { getTripDepartureById, isDepartureValidOnDate } from "@/db/queries/trips";
import { formatDateLong } from "@/lib/format";
import { getActiveUserSessionId } from "@/lib/user-session";
import { getUserById } from "@/db/queries/users";
import { CheckCircleIcon } from "@/components/icons";
import { BookingCheckout } from "./booking-checkout";
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

          <BookingCheckout
            tripDepartureId={id}
            date={date}
            defaultSeats={defaultSeats}
            error={error}
            profile={profile ? { name: profile.name, email: profile.email, phone: profile.phone } : null}
            bp={bp}
            common={dict.common}
            locale={locale}
            trip={{
              basePrice: trip.basePrice ?? "0",
              fromStationName: trip.fromStationName,
              toStationName: trip.toStationName,
              departureTime: trip.departureTime,
              arrivalTime: trip.arrivalTime,
              durationMin: trip.durationMin,
              weekdays: trip.weekdays,
              operatorName: trip.operatorName,
              routeCode: trip.routeCode,
            }}
          />
        </div>
      )}
    </div>
  );
}
