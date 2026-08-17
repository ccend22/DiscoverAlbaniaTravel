import Link from "next/link";
import { MapPinIcon } from "@/components/icons";
import { formatMessage, type Dictionary } from "@/lib/dictionary";

export interface TaxiRecommendation {
  origin: string;
  destination: string;
  priceEur: number;
  km: number;
  requestHref: string;
}

interface TaxiRecommendationCardProps {
  recommendation: TaxiRecommendation;
  dict: Dictionary;
}

export function TaxiRecommendationCard({ recommendation, dict }: TaxiRecommendationCardProps) {
  const sp = dict.searchPage;
  return (
    <article className="card-lift flex flex-col gap-5 rounded-2xl border-2 border-lime-strong bg-lime-soft p-5 shadow-[0_14px_38px_rgba(77,124,15,0.14)] sm:flex-row sm:items-stretch sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-lime-strong px-2.5 py-1 text-xs font-bold text-white">
            <MapPinIcon width={12} height={12} />
            {sp.taxiCardBadge}
          </span>
          <span className="text-sm text-lime-strong/80">{sp.taxiCardInfo}</span>
        </div>

        <p className="flex items-center gap-1.5 truncate text-sm text-foreground/90">
          <MapPinIcon width={14} height={14} className="shrink-0 text-coral" />
          <span className="truncate">
            {recommendation.origin} → {recommendation.destination}
          </span>
        </p>

        <p className="text-xs text-muted">{sp.taxiCardSubtitle}</p>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-lime-strong/20 pt-4 sm:flex-col sm:items-end sm:justify-between sm:border-t-0 sm:pt-0.5">
        <div className="text-right">
          <span className="text-lg font-semibold text-foreground">~€{recommendation.priceEur}</span>
          <p className="text-xs text-muted">{formatMessage(sp.taxiCardPriceNote, { km: recommendation.km })}</p>
        </div>
        <Link
          href={recommendation.requestHref}
          className="relative inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-lime-strong px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-xs)] transition-[background-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:opacity-90"
        >
          {sp.taxiCardCta}
        </Link>
      </div>
    </article>
  );
}
