// Curated photography for the handful of cities we have real photos for.
// Shared by the destinations list, the destination cards, and the
// destination detail page so all three stay in sync -- a destination that
// gets a photo anywhere gets it everywhere.
export const DESTINATION_IMAGES: Record<string, string> = {
  berat: "/images/destinations/berat.jpg",
  durres: "/images/destinations/durres.jpg",
  sarande: "/images/destinations/sarande.jpg",
  shkoder: "/images/destinations/shkoder.jpg",
  tirane: "/images/destinations/tirana.jpg",
  vlore: "/images/destinations/vlore.jpg",
};

const COMBINING_DIACRITICS_RE = /[̀-ͯ]/g;

export function normalizeDestinationName(name: string) {
  return name
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS_RE, "")
    .trim()
    .toLowerCase();
}

export function getDestinationImage(name: string): string | undefined {
  return DESTINATION_IMAGES[normalizeDestinationName(name)];
}
