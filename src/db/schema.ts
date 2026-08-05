import {
  pgTable,
  pgEnum,
  integer,
  text,
  numeric,
  boolean,
  smallint,
  time,
  date,
  timestamp,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const blogCategoryEnum = pgEnum("blog_category", ["news", "activity"]);
export const bookingStatusEnum = pgEnum("booking_status", ["confirmed", "cancelled"]);
export const vendorStatusEnum = pgEnum("vendor_status", ["pending", "approved", "rejected"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const taxiProviderStatusEnum = pgEnum("taxi_provider_status", ["pending", "approved", "rejected"]);
export const taxiRideStatusEnum = pgEnum("taxi_ride_status", [
  "requested",
  "accepted",
  "declined",
  "cancelled",
  "completed",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorized",
  "paid",
  "failed",
  "refunded",
  "cancelled",
]);

export const operators = pgTable("operators", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sourceId: integer("source_id").unique(),
  vat: text("vat").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  street: text("street"),
  city: text("city"),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("0"),
  ratingCount: integer("rating_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vendorUsers = pgTable("vendor_users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  operatorId: integer("operator_id")
    .notNull()
    .references(() => operators.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  status: vendorStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const adminUsers = pgTable("admin_users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  status: userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const stations = pgTable("stations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sourceId: integer("source_id").notNull().unique(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  city: text("city").notNull(),
  address: text("address"),
  latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const routes = pgTable("routes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  longName: text("long_name").notNull(),
  operatorId: integer("operator_id")
    .notNull()
    .references(() => operators.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tripDepartures = pgTable(
  "trip_departures",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    routeId: integer("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "restrict" }),
    fromStationId: integer("from_station_id")
      .notNull()
      .references(() => stations.id, { onDelete: "restrict" }),
    toStationId: integer("to_station_id")
      .notNull()
      .references(() => stations.id, { onDelete: "restrict" }),
    departureTime: time("departure_time").notNull(),
    arrivalTime: time("arrival_time").notNull(),
    durationMin: numeric("duration_min", { precision: 6, scale: 1 }).notNull(),
    distanceKm: numeric("distance_km", { precision: 6, scale: 1 }).notNull(),
    weekdays: smallint("weekdays").array().notNull(),
    basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull().default("1"),
    plannedSeats: integer("planned_seats").notNull().default(60),
    freeSeats: integer("free_seats").notNull().default(0),
    canBoard: boolean("can_board").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("trip_departures_natural_key").on(
      table.routeId,
      table.fromStationId,
      table.toStationId,
      table.departureTime
    ),
    index("trip_departures_search_idx").on(
      table.fromStationId,
      table.toStationId,
      table.departureTime
    ),
    index("trip_departures_route_idx").on(table.routeId),
    index("trip_departures_weekdays_gin").using("gin", table.weekdays),
    check(
      "trip_departures_seats_range",
      sql`${table.plannedSeats} >= 0 and ${table.freeSeats} >= 0 and ${table.freeSeats} <= ${table.plannedSeats}`
    ),
  ]
);

export const destinations = pgTable("destinations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sourceId: integer("source_id").notNull().unique(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blogPosts = pgTable("blog_posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sourceId: integer("source_id").notNull().unique(),
  category: blogCategoryEnum("category").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description").notNull(),
  postDate: timestamp("post_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable(
  "bookings",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    bookingReference: text("booking_reference").notNull().unique(),
    tripDepartureId: integer("trip_departure_id")
      .notNull()
      .references(() => tripDepartures.id, { onDelete: "restrict" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    travelDate: date("travel_date", { mode: "string" }).notNull(),
    passengerName: text("passenger_name").notNull(),
    passengerPhone: text("passenger_phone").notNull(),
    passengerEmail: text("passenger_email").notNull(),
    seats: integer("seats").notNull(),
    priceAtBooking: numeric("price_at_booking", { precision: 10, scale: 2 }).notNull(),
    status: bookingStatusEnum("status").notNull().default("confirmed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [check("bookings_seats_range", sql`${table.seats} > 0 and ${table.seats} <= 9`)]
);

export const tripInventories = pgTable(
  "trip_inventories",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tripDepartureId: integer("trip_departure_id")
      .notNull()
      .references(() => tripDepartures.id, { onDelete: "cascade" }),
    travelDate: date("travel_date", { mode: "string" }).notNull(),
    totalSeats: integer("total_seats").notNull(),
    availableSeats: integer("available_seats").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("trip_inventories_departure_date_key").on(
      table.tripDepartureId,
      table.travelDate
    ),
    check(
      "trip_inventories_seats_range",
      sql`${table.availableSeats} >= 0 and ${table.availableSeats} <= ${table.totalSeats}`
    ),
  ]
);

export const taxiProviders = pgTable("taxi_providers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  city: text("city").notNull(),
  status: taxiProviderStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const taxiProviderUsers = pgTable("taxi_provider_users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  taxiProviderId: integer("taxi_provider_id")
    .notNull()
    .references(() => taxiProviders.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const taxiVehicles = pgTable("taxi_vehicles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  taxiProviderId: integer("taxi_provider_id")
    .notNull()
    .references(() => taxiProviders.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model").notNull(),
  plateNumber: text("plate_number").notNull().unique(),
  passengerCapacity: integer("passenger_capacity").notNull().default(4),
  active: boolean("active").notNull().default(true),
});

export const taxiRideRequests = pgTable(
  "taxi_ride_requests",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    requestReference: text("request_reference").notNull().unique(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    taxiProviderId: integer("taxi_provider_id").references(() => taxiProviders.id, {
      onDelete: "set null",
    }),
    taxiVehicleId: integer("taxi_vehicle_id").references(() => taxiVehicles.id, {
      onDelete: "set null",
    }),
    acceptedByTaxiProviderUserId: integer("accepted_by_taxi_provider_user_id").references(
      () => taxiProviderUsers.id,
      { onDelete: "set null" }
    ),
    pickupLocation: text("pickup_location").notNull(),
    destination: text("destination").notNull(),
    pickupAt: timestamp("pickup_at", { withTimezone: true }).notNull(),
    passengers: integer("passengers").notNull(),
    passengerName: text("passenger_name").notNull(),
    passengerPhone: text("passenger_phone").notNull(),
    passengerEmail: text("passenger_email").notNull(),
    notes: text("notes"),
    quotedPrice: numeric("quoted_price", { precision: 10, scale: 2 }),
    status: taxiRideStatusEnum("status").notNull().default("requested"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    check("taxi_ride_requests_passengers_range", sql`${table.passengers} > 0 and ${table.passengers} <= 8`),
    index("taxi_ride_requests_pickup_idx").on(table.pickupAt),
  ]
);

export const taxiRequestDeclines = pgTable(
  "taxi_request_declines",
  {
    taxiRideRequestId: integer("taxi_ride_request_id")
      .notNull()
      .references(() => taxiRideRequests.id, { onDelete: "cascade" }),
    taxiProviderId: integer("taxi_provider_id")
      .notNull()
      .references(() => taxiProviders.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("taxi_request_declines_request_provider_key").on(
      table.taxiRideRequestId,
      table.taxiProviderId
    ),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "restrict" }),
    taxiRideRequestId: integer("taxi_ride_request_id").references(() => taxiRideRequests.id, {
      onDelete: "restrict",
    }),
    provider: text("provider").notNull(),
    providerPaymentId: text("provider_payment_id").unique(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("EUR"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "payments_single_target",
      sql`num_nonnulls(${table.bookingId}, ${table.taxiRideRequestId}) = 1`
    ),
    check("payments_amount_nonnegative", sql`${table.amount} >= 0`),
  ]
);

export const operatorsRelations = relations(operators, ({ many }) => ({
  routes: many(routes),
}));

export const vendorUsersRelations = relations(vendorUsers, ({ one }) => ({
  operator: one(operators, { fields: [vendorUsers.operatorId], references: [operators.id] }),
}));

export const stationsRelations = relations(stations, ({ many }) => ({
  departuresFrom: many(tripDepartures, { relationName: "departuresFrom" }),
  departuresTo: many(tripDepartures, { relationName: "departuresTo" }),
}));

export const routesRelations = relations(routes, ({ one, many }) => ({
  operator: one(operators, { fields: [routes.operatorId], references: [operators.id] }),
  departures: many(tripDepartures),
}));

export const tripDeparturesRelations = relations(tripDepartures, ({ one, many }) => ({
  route: one(routes, { fields: [tripDepartures.routeId], references: [routes.id] }),
  fromStation: one(stations, {
    fields: [tripDepartures.fromStationId],
    references: [stations.id],
    relationName: "departuresFrom",
  }),
  toStation: one(stations, {
    fields: [tripDepartures.toStationId],
    references: [stations.id],
    relationName: "departuresTo",
  }),
  bookings: many(bookings),
  inventories: many(tripInventories),
}));

export const tripInventoriesRelations = relations(tripInventories, ({ one }) => ({
  tripDeparture: one(tripDepartures, {
    fields: [tripInventories.tripDepartureId],
    references: [tripDepartures.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  taxiRideRequests: many(taxiRideRequests),
}));

export const taxiProvidersRelations = relations(taxiProviders, ({ many }) => ({
  users: many(taxiProviderUsers),
  vehicles: many(taxiVehicles),
  rideRequests: many(taxiRideRequests),
}));

export const taxiProviderUsersRelations = relations(taxiProviderUsers, ({ one }) => ({
  provider: one(taxiProviders, {
    fields: [taxiProviderUsers.taxiProviderId],
    references: [taxiProviders.id],
  }),
}));

export const taxiVehiclesRelations = relations(taxiVehicles, ({ one }) => ({
  provider: one(taxiProviders, {
    fields: [taxiVehicles.taxiProviderId],
    references: [taxiProviders.id],
  }),
}));

export const taxiRideRequestsRelations = relations(taxiRideRequests, ({ one }) => ({
  user: one(users, { fields: [taxiRideRequests.userId], references: [users.id] }),
  provider: one(taxiProviders, {
    fields: [taxiRideRequests.taxiProviderId],
    references: [taxiProviders.id],
  }),
  vehicle: one(taxiVehicles, {
    fields: [taxiRideRequests.taxiVehicleId],
    references: [taxiVehicles.id],
  }),
  acceptedBy: one(taxiProviderUsers, {
    fields: [taxiRideRequests.acceptedByTaxiProviderUserId],
    references: [taxiProviderUsers.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  tripDeparture: one(tripDepartures, {
    fields: [bookings.tripDepartureId],
    references: [tripDepartures.id],
  }),
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
  taxiRideRequest: one(taxiRideRequests, {
    fields: [payments.taxiRideRequestId],
    references: [taxiRideRequests.id],
  }),
}));
