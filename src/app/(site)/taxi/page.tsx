import { getActiveUserSessionId } from "@/lib/user-session";
import { getUserById } from "@/db/queries/users";
import { getAlbaniaDateInputValue } from "@/lib/timezone";
import { AlbaniaMapVisual } from "@/components/albania-map-visual";
import { TaxiRequestForm } from "@/components/taxi-request-form";
import { ClockIcon, CheckCircleIcon, MapPinIcon } from "@/components/icons";
import { getLocaleAndDictionary } from "@/lib/i18n";

export default async function TaxiPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [params, userId, { dict }] = await Promise.all([searchParams, getActiveUserSessionId(), getLocaleAndDictionary()]);
  const user = userId ? await getUserById(userId) : null;
  const minimumDate = getAlbaniaDateInputValue();
  const tp = dict.taxiPage;

  const TRUST_PILLS = [
    { Icon: ClockIcon, label: tp.trustPill247, iconClass: "text-gold-soft" },
    { Icon: CheckCircleIcon, label: tp.trustPillNoPrepay, iconClass: "text-teal-soft" },
    { Icon: MapPinIcon, label: tp.trustPillNationwide, iconClass: "text-coral-soft" },
  ];

  const NEXT_STEPS = [
    { title: tp.step1Title, body: tp.step1Body, dotClass: "bg-teal" },
    { title: tp.step2Title, body: tp.step2Body, dotClass: "bg-coral" },
    { title: tp.step3Title, body: tp.step3Body, dotClass: "bg-gold" },
    { title: tp.step4Title, body: tp.step4Body, dotClass: "bg-sky" },
  ];

  const REASSURANCES = [tp.reassurance1, tp.reassurance2, tp.reassurance3, tp.reassurance4];

  return (
    <div>
      <section className="relative overflow-hidden bg-brand-deep text-white">
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 animate-float rounded-full bg-teal/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-32 top-1/3 h-[28rem] w-[28rem] animate-float rounded-full bg-coral/25 blur-3xl [animation-delay:-3s]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/4 h-64 w-64 animate-float rounded-full bg-gold/20 blur-3xl [animation-delay:-6s]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(255,255,255,0.1),transparent)]"
          aria-hidden="true"
        />
        <div className="grain-overlay pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12">
          <div>
            <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.14em] text-white/62">
              {tp.kicker}
            </p>
            <h1 className="mt-3 max-w-xl animate-fade-up font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white [animation-delay:80ms] sm:text-5xl">
              {tp.title}
            </h1>
            <p className="mt-4 max-w-lg animate-fade-up text-base leading-7 text-white/72 [animation-delay:160ms] sm:text-lg">
              {tp.subtitle}
            </p>
            <div className="mt-6 flex animate-fade-up flex-wrap gap-2 [animation-delay:220ms]">
              {TRUST_PILLS.map(({ Icon, label, iconClass }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm"
                >
                  <Icon width={14} height={14} className={iconClass} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="hidden animate-fade-up justify-self-end [animation-delay:260ms] lg:block" aria-hidden="true">
            <AlbaniaMapVisual className="h-auto w-full max-w-[240px] text-white/65 drop-shadow-[0_20px_45px_rgba(0,0,0,0.35)]" />
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-8 max-w-6xl px-4 pb-16 sm:px-6 lg:grid lg:grid-cols-[1fr_300px] lg:items-start lg:gap-8">
        <TaxiRequestForm error={params.error} minimumDate={minimumDate} user={user} dict={dict} />

        <aside className="mt-8 flex flex-col gap-5 lg:mt-0 lg:sticky lg:top-24">
          <div className="animate-fade-up rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-md)] [animation-delay:120ms]">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal">{tp.whatHappensNext}</p>
            <ol className="mt-4 flex flex-col gap-4">
              {NEXT_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-[var(--shadow-xs)] ${step.dotClass}`}>
                      {index + 1}
                    </span>
                    {index < NEXT_STEPS.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
                    )}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-semibold text-foreground">{step.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="animate-fade-up rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-md)] [animation-delay:160ms]">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal">{tp.whyBookWithUs}</p>
            <ul className="mt-4 flex flex-col gap-3">
              {REASSURANCES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground/90">
                  <CheckCircleIcon width={16} height={16} className="mt-0.5 shrink-0 text-teal" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
