import { getAdminOverviewStats } from "@/db/queries/admin";
import { formatPrice } from "@/lib/format";
import {
  TicketIcon,
  CheckCircleIcon,
  BuildingIcon,
  ClockIcon,
} from "@/components/icons";

// Complete literal classes per accent — Tailwind can't resolve `bg-${color}`
// template interpolation, so each full string must appear as-is in source.
const ACCENTS = {
  teal: { bar: "bg-teal", badge: "bg-teal-soft text-teal", glow: "hover:shadow-[var(--shadow-glow-teal)]" },
  coral: { bar: "bg-coral", badge: "bg-coral-soft text-coral", glow: "hover:shadow-[var(--shadow-glow-coral)]" },
  gold: { bar: "bg-gold", badge: "bg-gold-soft text-gold", glow: "hover:shadow-[var(--shadow-glow-gold)]" },
  sky: { bar: "bg-sky", badge: "bg-sky-soft text-sky", glow: "hover:shadow-[var(--shadow-glow-sky)]" },
} as const;

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: keyof typeof ACCENTS;
}) {
  const { bar, badge, glow } = ACCENTS[accent];
  return (
    <div className={`card-lift relative overflow-hidden rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)] ${glow}`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${bar}`} aria-hidden="true" />
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${badge}`}>
        {icon}
      </div>
      <p className="mt-3 text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-brand-strong">{value}</p>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const stats = await getAdminOverviewStats();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.1em] text-teal">Administration</p>
      <h1 className="mt-1 animate-fade-up font-display text-2xl font-bold text-foreground [animation-delay:60ms]">Platform overview</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<TicketIcon width={16} height={16} />}
          label="Total bookings"
          value={stats.totalBookings}
          accent="teal"
        />
        <StatCard
          icon={<CheckCircleIcon width={16} height={16} />}
          label="Confirmed bookings"
          value={stats.confirmedBookings}
          accent="gold"
        />
        <StatCard
          icon={<BuildingIcon width={16} height={16} />}
          label="Active operators"
          value={stats.activeOperators}
          accent="coral"
        />
        <StatCard
          icon={<ClockIcon width={16} height={16} />}
          label="Upcoming departures"
          value={stats.upcomingDepartures}
          accent="sky"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard icon={<ClockIcon width={16} height={16} />} label="Pending bus vendors" value={stats.pendingVendorApplications} accent="gold" />
        <StatCard icon={<TicketIcon width={16} height={16} />} label="Taxi requests" value={stats.taxiRequests} accent="coral" />
      </div>

      <div className="relative mt-4 overflow-hidden rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <span className="absolute inset-x-0 top-0 h-1 bg-teal" aria-hidden="true" />
        <p className="text-sm text-muted">Total revenue (paid bookings)</p>
        <p className="mt-1 font-display text-3xl font-bold text-brand-strong">
          {formatPrice(stats.totalRevenue)}
        </p>
        <p className="mt-2 text-xs text-muted">
          Ticket prices are currently a platform-wide placeholder value from the source data, so
          revenue totals will look flat until real pricing is available.
        </p>
      </div>
    </div>
  );
}
