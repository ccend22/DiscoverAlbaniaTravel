import { z } from "zod";
import { albaniaLocalDateTimeToDate } from "@/lib/timezone";
import { MIN_TAXI_LEAD_TIME_HOURS } from "@/lib/taxi-service";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Enter a valid date");
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time");

function todayInAlbania(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tirane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const searchParamsSchema = z
  .object({
    origin: z.string().trim().min(1, "Enter a departure city or station"),
    destination: z.string().trim().min(1, "Enter a destination city or station"),
    date: dateString,
    tripType: z.enum(["oneway", "roundtrip"]).default("oneway"),
    returnDate: dateString.optional(),
    time: timeString.optional(),
    passengers: z.coerce.number().int().min(1).max(9).default(1),
  })
  .refine((data) => data.date >= todayInAlbania(), {
    message: "Choose today or a future date",
    path: ["date"],
  })
  .refine(
    (data) => data.tripType !== "roundtrip" || (!!data.returnDate && data.returnDate >= data.date),
    { message: "Choose a return date on or after your departure date", path: ["returnDate"] }
  );

export type SearchParamsInput = z.infer<typeof searchParamsSchema>;

export const passengerDetailsSchema = z.object({
  passengerName: z.string().trim().min(2, "Enter the passenger's full name"),
  passengerPhone: z.string().trim().min(6, "Enter a valid phone number"),
  passengerEmail: z.string().trim().email("Enter a valid email address"),
});

export const bookingFormSchema = z
  .object({
    tripDepartureId: z.coerce.number().int().positive(),
    travelDate: dateString,
    seats: z.coerce.number().int().min(1, "At least 1 seat is required").max(9, "Max 9 seats per booking"),
  })
  .extend(passengerDetailsSchema.shape)
  .refine((data) => data.travelDate >= todayInAlbania(), {
    message: "Choose today or a future travel date",
    path: ["travelDate"],
  });

const taxiCoordinate = z
  .string()
  .trim()
  .min(1, "Choose both locations from the suggestions or map")
  .transform(Number)
  .pipe(z.number().finite("Choose a valid location"));

export const taxiRideRequestSchema = z.object({
  pickupLocation: z.string().trim().min(3, "Enter a pickup location"),
  destination: z.string().trim().min(3, "Enter a destination"),
  pickupLatitude: taxiCoordinate.pipe(z.number().min(-90).max(90)),
  pickupLongitude: taxiCoordinate.pipe(z.number().min(-180).max(180)),
  destinationLatitude: taxiCoordinate.pipe(z.number().min(-90).max(90)),
  destinationLongitude: taxiCoordinate.pipe(z.number().min(-180).max(180)),
  pickupDate: dateString,
  pickupTime: timeString,
  passengerPhone: z.string().trim().min(6, "Enter a valid phone number"),
}).refine(
  (data) => albaniaLocalDateTimeToDate(data.pickupDate, data.pickupTime).getTime() >= Date.now() + MIN_TAXI_LEAD_TIME_HOURS * 60 * 60 * 1000,
  { message: `Choose a pickup time at least ${MIN_TAXI_LEAD_TIME_HOURS} hours from now.`, path: ["pickupTime"] }
);

export type BookingFormInput = z.infer<typeof bookingFormSchema>;

export const referenceLookupSchema = z.object({
  reference: z.string().trim().min(4, "Enter your booking reference"),
});

export const vendorLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Enter your password"),
});

export const vendorOperatorSchema = z.object({
  name: z.string().trim().min(2, "Enter the operator name"),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email address").or(z.literal("")).optional(),
  street: z.string().trim().optional(),
  city: z.string().trim().optional(),
});

export const userSignupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().trim().optional(),
});

export const userLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Enter your password"),
});

export const userProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  phone: z.string().trim().optional(),
});

export const vendorDepartureSchema = z
  .object({
    tripDepartureId: z.coerce.number().int().positive(),
    departureTime: timeString,
    arrivalTime: timeString,
    basePrice: z.coerce.number().min(0).transform((value) => value.toFixed(2)),
    plannedSeats: z.coerce.number().int().min(0).max(500),
    freeSeats: z.coerce.number().int().min(0).max(500),
    canBoard: z.enum(["on", "true"]).optional(),
    weekdays: z
      .array(z.coerce.number().int().min(1).max(7))
      .min(1, "Choose at least one operating day"),
  })
  .refine((data) => data.freeSeats <= data.plannedSeats, {
    message: "Free seats cannot exceed planned seats",
    path: ["freeSeats"],
  });

export const vendorRouteSchema = z.object({
  code: z.string().trim().min(2, "Enter a route code").max(30),
  longName: z.string().trim().min(3, "Enter a route name").max(160),
});

export const adminOperatorCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter the operator name"),
  vat: z.string().trim().min(3, "Enter the operator's VAT/tax number"),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email address").or(z.literal("")).optional(),
  street: z.string().trim().optional(),
  city: z.string().trim().optional(),
});

export const adminStationSchema = z.object({
  name: z.string().trim().min(2, "Enter the station name"),
  code: z.string().trim().min(1, "Enter a station code").max(20),
  city: z.string().trim().min(2, "Enter the station's city"),
  address: z.string().trim().optional(),
  latitude: z.coerce.number().min(-90).max(90).transform((value) => value.toFixed(6)),
  longitude: z.coerce.number().min(-180).max(180).transform((value) => value.toFixed(6)),
});

export const adminDestinationSchema = z.object({
  name: z.string().trim().min(2, "Enter the destination name"),
  description: z.string().trim().min(10, "Enter a description of at least 10 characters"),
});

export const adminBlogPostSchema = z.object({
  category: z.enum(["news", "activity"]),
  title: z.string().trim().min(2, "Enter a title"),
  subtitle: z.string().trim().optional(),
  description: z.string().trim().min(10, "Enter a description of at least 10 characters"),
  postDate: dateString,
});

export const adminUserCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter a name"),
  email: z.string().trim().email("Enter a valid email address").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const adminUserUpdateSchema = z.object({
  name: z.string().trim().min(2, "Enter a name"),
  email: z.string().trim().email("Enter a valid email address").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
});

export const adminTravelerEditSchema = z.object({
  name: z.string().trim().min(2, "Enter the traveler's full name"),
  email: z.string().trim().email("Enter a valid email address").transform((value) => value.toLowerCase()),
  phone: z.string().trim().optional(),
});

export const adminVendorUserEditSchema = z.object({
  name: z.string().trim().min(2, "Enter the contact's full name"),
  email: z.string().trim().email("Enter a valid email address").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
});

export const vendorClaimSignupSchema = z.object({
  operatorId: z.coerce.number().int().positive("Choose your company from the list"),
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email address").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const vendorNewOperatorSignupSchema = z.object({
  operatorName: z.string().trim().min(2, "Enter the company name"),
  vat: z.string().trim().min(3, "Enter the company's VAT/tax number"),
  phone: z.string().trim().optional(),
  street: z.string().trim().optional(),
  city: z.string().trim().optional(),
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email address").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const vendorNewDepartureSchema = z
  .object({
    routeId: z.coerce.number().int().positive(),
    fromStationId: z.coerce.number().int().positive(),
    toStationId: z.coerce.number().int().positive(),
    departureTime: timeString,
    arrivalTime: timeString,
    durationMin: z.coerce.number().positive().max(1440).transform((value) => Math.round(value).toString()),
    distanceKm: z.coerce.number().positive().max(2000).transform((value) => value.toFixed(1)),
    basePrice: z.coerce.number().min(0).transform((value) => value.toFixed(2)),
    plannedSeats: z.coerce.number().int().min(1).max(500),
    weekdays: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Choose at least one operating day"),
  })
  .refine((data) => data.fromStationId !== data.toStationId, {
    message: "Origin and destination must be different",
    path: ["toStationId"],
  });
