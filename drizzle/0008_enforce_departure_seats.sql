UPDATE "trip_departures"
SET
  "planned_seats" = greatest("planned_seats", 0),
  "free_seats" = greatest(0, least("free_seats", greatest("planned_seats", 0)))
WHERE "planned_seats" < 0 OR "free_seats" < 0 OR "free_seats" > "planned_seats";
--> statement-breakpoint
ALTER TABLE "trip_departures" ADD CONSTRAINT "trip_departures_seats_range" CHECK ("trip_departures"."planned_seats" >= 0 and "trip_departures"."free_seats" >= 0 and "trip_departures"."free_seats" <= "trip_departures"."planned_seats");
