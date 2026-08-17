# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

International and Albanian travelers arranging transport within Albania, often from an airport, hotel, address, city, or landmark. Their core job is to understand the available journey, price, timing, and next action quickly on desktop or mobile.

## Product Purpose

Discover Albania Transport helps travelers search intercity buses, request scheduled private taxi transfers, and discover Albanian destinations. Success means a traveler can confidently submit a valid transport request and the operator receives enough accurate information to confirm it.

## Positioning

One local travel service combines scheduled Albanian bus discovery with door-to-door private transfers, including direct-route taxi fares and map-based pricing for custom journeys.

## Operating Context

Travelers use the service while planning or already traveling, frequently on mobile, with unfamiliar Albanian place names and time-sensitive pickup needs. Taxi bookings require pickup and destination, coordinates, a pickup schedule, a phone number, a traveler email, and optional trip notes. Bookings are stored immediately and the final price is confirmed by the travel team.

## Capabilities and Constraints

- Next.js 16.3 App Router application with React 19, Tailwind CSS 4, Server Actions, Drizzle ORM, Google Maps/Places, and Nodemailer.
- Taxi transfers require at least five hours' notice. Custom map requests enforce an intercity minimum distance of 20 km; recognized direct routes from the supplied fare table may qualify below that threshold.
- Known direct journeys from Tirana use provider prices supplied in the owner's Google Sheet. Custom map journeys are estimated at EUR 1 per km.
- Direct fares come from the owner-supplied provider table, but travelers do not select a taxi provider in the booking form. Do not invent vehicle capacities, availability, or marketing claims.
- Every taxi reservation must be emailed to endidiscoveral@gmail.com, confirmed to the traveler by email, and remain visible in the existing admin/database flow.
- English and Albanian localization, keyboard operation, long place names, and mobile geolocation/map selection must remain supported.

## Brand Commitments

The product name is Discover Albania Transport. Bus and taxi booking share the established white, sea-glass, teal, navy, coral, Inter, and Merriweather design language so mode switching feels like one coherent product.

## Evidence on Hand

- Existing production taxi form and booking stack in `src/components/taxi-quick-form.tsx`, `src/app/(site)/taxi/actions.ts`, and `src/db/queries/taxi.ts`.
- Google Sheet fare comparison for six real taxi providers, sheet ID `1lLkTAygwKWqCHXJDHaqbYjmdnQNnEUqD`, tab gid `604527176`.
- Existing Albanian Riviera hero photograph at `public/images/destinations/The_best_of_south_tour.jpg`.
- Detailed redesign and accessibility brief supplied with this task. No provider capacities, real-time availability, testimonials, payment promise, or luxury-vehicle claims were supplied and must not be fabricated.

## Product Principles

- Make the journey and price legible before asking for contact details.
- Preserve local truth: real places, real providers, real direct fares, and explicit estimates for custom routes.
- Keep the request flow personal and reassuring without hiding operational constraints.
- Treat accessibility, responsive behavior, and error recovery as part of trust.
- Preserve user-entered data through validation and submission failures.

## Accessibility & Inclusion

The taxi flow must provide semantic labels and groups, logical keyboard order, visible focus states, minimum 44px touch targets, sufficient contrast, inline recovery-oriented errors, reduced-motion support, and resilient layouts for English and Albanian copy from 320px mobile through large desktop.
