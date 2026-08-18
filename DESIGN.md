---
name: "Discover Albania Transport — Unified Booking Forms"
description: "Bus and taxi booking share one white, teal, and sea-glass interface system."
colors:
  canvas: "#edf4f3"
  surface: "#ffffff"
  ink: "#12333a"
  muted: "#687775"
  teal: "#008080"
  teal-soft: "#e4f3f1"
  coral: "#e2543c"
  gold: "#c78400"
  border: "#dce8e6"
typography:
  display: "Merriweather"
  body: "Inter"
rounded:
  control: "0.75rem"
  field: "1.1rem"
  panel: "1.5rem"
  shell: "2rem"
---

# Design system: unified bus and taxi booking

## Direction

The bus ticket form is the visual authority for the taxi form. Both modes use the same white shell, pale sea-glass field bed, teal primary actions, navy ink, muted supporting copy, Inter controls, and Merriweather headings. The former dark, gold, Plus Jakarta taxi console is retired.

## Taxi booking flow

- The route fields start empty and use example placeholders. No route is preselected.
- Pickup and destination are followed by date, time, passengers, and one `Book taxi` action.
- The first action validates the verified route and five-hour lead time, then reveals only phone, email, an optional note, and `Confirm booking`.
- Taxi-provider choice is removed. Every route, including recognized direct routes and custom map journeys, is estimated and charged in EUR at €1/km.
- The map opens in the existing viewport-bound light modal. It must never expand the homepage hero or render as an inline full-width panel.
- The booking is stored before email delivery. The owner receives operational details at `endidiscoveral@gmail.com` by default, and the traveler receives a separate confirmation at the required email entered in the form.

## Components

### Mode switch

The bus/taxi tablist stays white in both modes, with teal as the selected indicator and white selected text. Keyboard arrow, Home, and End navigation remain supported.

### Location fields

White fields sit on the sea-glass bed. Pickup uses a teal marker; destination uses coral. Each field retains its compact tools dropdown for map selection, clearing, and current location where relevant. Typed values are not treated as verified until Places, the map, or geolocation supplies coordinates.

### Schedule, passengers, and fare

Date and time use white 44px controls with restrained gold schedule icons. Passenger choices use teal only for the active count. The fare is one white summary row with route status, distance, pricing source, and amount—without provider comparison.

### Contact step

Phone and email are required. Email is prefilled for signed-in travelers and collected for guests. The optional note remains progressively disclosed.

## Accessibility and behavior

- Maintain 44px minimum targets, semantic labels, visible teal focus states, inline recovery messages, and keyboard-accessible dialogs.
- Preserve English and Albanian copy, long place names, 320px mobile layouts, and reduced-motion behavior.
- Use booking language on user-facing actions; `request` may remain only in internal data and API names.
- Do not add provider selection, dark taxi-only theming, decorative headers inside the form, or hardcoded route defaults.
