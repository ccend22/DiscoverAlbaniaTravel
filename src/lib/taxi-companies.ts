export const TAXI_COMPANIES = ["Lux Taxi", "Blue Taxi", "Merr Taxi", "Thirr Taxi", "Smart Taxi", "City Taxi"] as const;

export type TaxiCompany = (typeof TAXI_COMPANIES)[number];
