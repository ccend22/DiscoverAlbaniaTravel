import { lookupBookingAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { getLocaleAndDictionary } from "@/lib/i18n";

interface BookingLookupPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function BookingLookupPage({ searchParams }: BookingLookupPageProps) {
  const { error } = await searchParams;
  const { dict } = await getLocaleAndDictionary();
  const bl = dict.bookingLookup;

  return (
    <div className="public-page mx-auto max-w-lg px-4 py-16 sm:px-6 sm:py-20">
      <p className="animate-fade-up text-[11px] font-black uppercase tracking-[0.2em] text-teal">{bl.kicker}</p>
      <h1 className="mt-3 animate-fade-up font-display text-4xl font-black tracking-[-0.035em] text-brand-navy [animation-delay:60ms]">{bl.title}</h1>
      <p className="mt-2 animate-fade-up text-sm text-muted [animation-delay:120ms]">
        {bl.subtitle}
      </p>
      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      <form action={lookupBookingAction} className="public-card mt-8 flex animate-fade-up flex-col gap-5 p-6 [animation-delay:160ms] sm:p-8">
        <input
          name="reference"
          required
          placeholder={bl.referencePlaceholder}
          className="public-input min-h-14 rounded-2xl px-4 py-3 uppercase placeholder:normal-case"
        />
        <Button type="submit">{bl.findBooking}</Button>
      </form>
    </div>
  );
}
