import { normalizeSearchText } from "@/lib/search-normalize";
import { TAXI_COMPANIES, type TaxiCompany } from "@/lib/taxi-companies";

export type TaxiFareCurrency = "ALL" | "EUR";

export interface DirectTaxiFare {
  amount: number;
  currency: TaxiFareCurrency;
  suffix?: string;
}

interface DirectTaxiRoute {
  name: string;
  aliases: string[];
  fares: Partial<Record<TaxiCompany, DirectTaxiFare>>;
  unavailable?: TaxiCompany[];
}

/**
 * One-way fares from Tirana supplied by the owner in the Google Sheet tab
 * gid=604527176. Blank cells stay blank: the UI calls those “Price on
 * request” instead of inventing a number. Only explicit “service not
 * offered” comments are represented as unavailable.
 */
const DIRECT_ROUTES_FROM_TIRANA: DirectTaxiRoute[] = [
  {
    name: "Equos Resort",
    aliases: ["equos resort", "equos resrort"],
    fares: {
      "Blue Taxi": { amount: 1500, currency: "ALL" },
      "Merr Taxi": { amount: 1200, currency: "ALL" },
      "Smart Taxi": { amount: 1200, currency: "ALL" },
      "City Taxi": { amount: 1000, currency: "ALL" },
    },
  },
  {
    name: "Gjiri i Lalëzit",
    aliases: ["gjiri i lalezit", "lalez"],
    fares: {
      "Blue Taxi": { amount: 2500, currency: "ALL" },
      "Merr Taxi": { amount: 2800, currency: "ALL" },
      "Smart Taxi": { amount: 2600, currency: "ALL" },
      "City Taxi": { amount: 2500, currency: "ALL" },
    },
  },
  {
    name: "Vaqarr",
    aliases: ["vaqarr", "prush"],
    fares: {
      "Merr Taxi": { amount: 1000, currency: "ALL" },
      "Smart Taxi": { amount: 1800, currency: "ALL" },
      "City Taxi": { amount: 2000, currency: "ALL" },
    },
  },
  {
    name: "Petrelë",
    aliases: ["petrela", "petrele", "kalaja e petreles"],
    fares: {
      "Blue Taxi": { amount: 1100, currency: "ALL" },
      "Merr Taxi": { amount: 1500, currency: "ALL" },
      "Smart Taxi": { amount: 1400, currency: "ALL" },
      "City Taxi": { amount: 2500, currency: "ALL" },
    },
  },
  {
    name: "Pëllumbas",
    aliases: ["pellumbas"],
    fares: {
      "Blue Taxi": { amount: 2000, currency: "ALL" },
      "Merr Taxi": { amount: 2000, currency: "ALL" },
      "Smart Taxi": { amount: 2200, currency: "ALL" },
      "City Taxi": { amount: 4000, currency: "ALL" },
    },
  },
  {
    name: "Bovillë",
    aliases: ["boville", "bovilla"],
    fares: {
      "Lux Taxi": { amount: 4000, currency: "ALL" },
      "Merr Taxi": { amount: 2500, currency: "ALL" },
      "City Taxi": { amount: 5000, currency: "ALL" },
    },
    unavailable: ["Blue Taxi", "Smart Taxi"],
  },
  {
    name: "Kepi i Rodonit",
    aliases: ["kepi i rodonit", "kepi rodonit", "cape of rodon"],
    fares: {
      "Blue Taxi": { amount: 2800, currency: "ALL" },
      "Merr Taxi": { amount: 3500, currency: "ALL" },
      "Smart Taxi": { amount: 6500, currency: "ALL" },
      "City Taxi": { amount: 5000, currency: "ALL" },
    },
  },
  {
    name: "Mrizi i Zanave",
    aliases: ["mrizi i zanave"],
    fares: {
      "Blue Taxi": { amount: 4500, currency: "ALL" },
      "Merr Taxi": { amount: 4500, currency: "ALL" },
      "Smart Taxi": { amount: 9000, currency: "ALL" },
      "City Taxi": { amount: 6500, currency: "ALL" },
    },
  },
  {
    name: "Berat",
    aliases: ["berat"],
    fares: {
      "Lux Taxi": { amount: 6000, currency: "ALL" },
      "Blue Taxi": { amount: 5500, currency: "ALL" },
      "Merr Taxi": { amount: 7000, currency: "ALL" },
      "Thirr Taxi": { amount: 55, currency: "EUR" },
      "Smart Taxi": { amount: 12000, currency: "ALL" },
      "City Taxi": { amount: 9000, currency: "ALL" },
    },
  },
  {
    name: "Krujë",
    aliases: ["kruje", "kruja"],
    fares: {
      "Lux Taxi": { amount: 3000, currency: "ALL" },
      "Blue Taxi": { amount: 2200, currency: "ALL" },
      "Merr Taxi": { amount: 2500, currency: "ALL" },
      "Thirr Taxi": { amount: 22, currency: "EUR" },
      "Smart Taxi": { amount: 6000, currency: "ALL" },
      "City Taxi": { amount: 3000, currency: "ALL" },
    },
  },
  {
    name: "Shkodër",
    aliases: ["shkoder", "shkodra"],
    fares: {
      "Lux Taxi": { amount: 6000, currency: "ALL" },
      "Blue Taxi": { amount: 6000, currency: "ALL" },
      "Merr Taxi": { amount: 7000, currency: "ALL" },
      "Thirr Taxi": { amount: 60, currency: "EUR" },
      "Smart Taxi": { amount: 12000, currency: "ALL" },
      "City Taxi": { amount: 8500, currency: "ALL" },
    },
  },
  {
    name: "Belsh",
    aliases: ["belsh"],
    fares: {
      "Blue Taxi": { amount: 4000, currency: "ALL" },
      "Merr Taxi": { amount: 3000, currency: "ALL" },
      "Smart Taxi": { amount: 7000, currency: "ALL" },
      "City Taxi": { amount: 5000, currency: "ALL" },
    },
  },
  {
    name: "Gjirokastër / Syri i Kaltër",
    aliases: ["gjirokaster", "syri i kalter", "blue eye"],
    fares: {
      "Lux Taxi": { amount: 10000, currency: "ALL" },
      "Blue Taxi": { amount: 16000, currency: "ALL" },
      "Merr Taxi": { amount: 14000, currency: "ALL" },
      "Thirr Taxi": { amount: 100, currency: "EUR" },
      "Smart Taxi": { amount: 25000, currency: "ALL" },
      "City Taxi": { amount: 15000, currency: "ALL" },
    },
  },
  {
    name: "Durrës",
    aliases: ["durres", "durresi"],
    fares: {
      "Lux Taxi": { amount: 2200, currency: "ALL" },
      "Blue Taxi": { amount: 2200, currency: "ALL" },
      "Merr Taxi": { amount: 2800, currency: "ALL" },
      "Thirr Taxi": { amount: 22, currency: "EUR" },
      "Smart Taxi": { amount: 6000, currency: "ALL" },
      "City Taxi": { amount: 2200, currency: "ALL" },
    },
  },
  {
    name: "Koman",
    aliases: ["koman"],
    fares: {
      "Lux Taxi": { amount: 9000, currency: "ALL" },
      "Blue Taxi": { amount: 11000, currency: "ALL" },
      "Merr Taxi": { amount: 9000, currency: "ALL" },
      "Smart Taxi": { amount: 120, currency: "EUR", suffix: " + toll" },
      "City Taxi": { amount: 13000, currency: "ALL" },
    },
  },
  {
    name: "Theth",
    aliases: ["theth"],
    fares: {
      "Lux Taxi": { amount: 12000, currency: "ALL" },
      "Merr Taxi": { amount: 13000, currency: "ALL" },
      "Smart Taxi": { amount: 15000, currency: "ALL" },
      "City Taxi": { amount: 17000, currency: "ALL" },
    },
    unavailable: ["Blue Taxi"],
  },
  {
    name: "Valbonë",
    aliases: ["valbone", "valbona"],
    fares: {
      "Lux Taxi": { amount: 14000, currency: "ALL" },
      "Merr Taxi": { amount: 16000, currency: "ALL" },
      "Thirr Taxi": { amount: 130, currency: "EUR" },
      "Smart Taxi": { amount: 17000, currency: "ALL" },
      "City Taxi": { amount: 18000, currency: "ALL" },
    },
    unavailable: ["Blue Taxi"],
  },
  {
    name: "Prizren",
    aliases: ["prizren"],
    fares: {
      "Lux Taxi": { amount: 110, currency: "EUR" },
      "Blue Taxi": { amount: 9000, currency: "ALL" },
      "Merr Taxi": { amount: 11000, currency: "ALL" },
      "Smart Taxi": { amount: 120, currency: "EUR", suffix: " + border fee" },
      "City Taxi": { amount: 160, currency: "EUR" },
    },
  },
  {
    name: "Vlorë",
    aliases: ["vlore", "vlora"],
    fares: {
      "Lux Taxi": { amount: 6000, currency: "ALL" },
      "Blue Taxi": { amount: 6000, currency: "ALL" },
      "Merr Taxi": { amount: 9000, currency: "ALL" },
      "Thirr Taxi": { amount: 60, currency: "EUR" },
      "Smart Taxi": { amount: 16000, currency: "ALL" },
      "City Taxi": { amount: 10000, currency: "ALL" },
    },
  },
  {
    name: "Teleferiku i Dajtit",
    aliases: ["teleferiku i dajtit", "teleferiku dajtit", "dajti ekspres", "dajti"],
    fares: {
      "Blue Taxi": { amount: 1800, currency: "ALL" },
      "Merr Taxi": { amount: 750, currency: "ALL" },
      "Smart Taxi": { amount: 800, currency: "ALL" },
      "City Taxi": { amount: 700, currency: "ALL" },
    },
  },
  {
    name: "Dhërmi",
    aliases: ["dhermi"],
    fares: {
      "Lux Taxi": { amount: 10000, currency: "ALL" },
      "Blue Taxi": { amount: 10000, currency: "ALL" },
      "Merr Taxi": { amount: 13500, currency: "ALL" },
      "Thirr Taxi": { amount: 100, currency: "EUR" },
      "Smart Taxi": { amount: 12000, currency: "ALL" },
      "City Taxi": { amount: 14000, currency: "ALL" },
    },
  },
  {
    name: "Kantina Duka",
    aliases: ["kantina duka", "duka winery"],
    fares: {
      "Blue Taxi": { amount: 2500, currency: "ALL" },
      "Merr Taxi": { amount: 2500, currency: "ALL" },
      "Smart Taxi": { amount: 2600, currency: "ALL" },
      "City Taxi": { amount: 2500, currency: "ALL" },
    },
  },
  {
    name: "Ksamil",
    aliases: ["ksamil"],
    fares: {
      "Lux Taxi": { amount: 16000, currency: "ALL" },
      "City Taxi": { amount: 18000, currency: "ALL" },
    },
  },
  {
    name: "Lezhë",
    aliases: ["lezhe", "lezha"],
    fares: {
      "Thirr Taxi": { amount: 30, currency: "EUR" },
      "City Taxi": { amount: 5500, currency: "ALL" },
    },
  },
  {
    name: "Sari Salltik",
    aliases: ["sarisalltik", "sari salltik"],
    fares: { "City Taxi": { amount: 3500, currency: "ALL" } },
  },
  {
    name: "Korçë",
    aliases: ["korce", "korca"],
    fares: { "Smart Taxi": { amount: 18000, currency: "ALL" } },
  },
  {
    name: "Apollonia",
    aliases: ["apollonia", "apolonia"],
    fares: { "Smart Taxi": { amount: 12000, currency: "ALL" } },
  },
];

function isTiranaLike(value: string): boolean {
  const normalized = normalizeSearchText(value);
  return normalized.includes("tirane") || normalized.includes("tirana");
}

function findRoute(placeName: string): DirectTaxiRoute | null {
  const normalized = normalizeSearchText(placeName);
  return (
    DIRECT_ROUTES_FROM_TIRANA.find((route) =>
      route.aliases.some((alias) => normalized.includes(normalizeSearchText(alias)))
    ) ?? null
  );
}

export interface DirectTaxiRouteMatch {
  routeName: string;
  fares: Partial<Record<TaxiCompany, DirectTaxiFare>>;
  unavailable: TaxiCompany[];
}

export function findDirectTaxiRoute(pickup: string, destination: string): DirectTaxiRouteMatch | null {
  const pickupIsTirana = isTiranaLike(pickup);
  const destinationIsTirana = isTiranaLike(destination);
  if (pickupIsTirana === destinationIsTirana) return null;

  const route = findRoute(pickupIsTirana ? destination : pickup);
  if (!route) return null;
  return {
    routeName: `Tiranë — ${route.name}`,
    fares: route.fares,
    unavailable: route.unavailable ?? [],
  };
}

export function formatDirectTaxiFare(fare: DirectTaxiFare): string {
  const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(fare.amount);
  return `${fare.currency === "EUR" ? "€" : ""}${amount}${fare.currency === "ALL" ? " ALL" : ""}${fare.suffix ?? ""}`;
}

export function getAvailableCompanies(match: DirectTaxiRouteMatch): TaxiCompany[] {
  return TAXI_COMPANIES.filter((company) => !match.unavailable.includes(company));
}
