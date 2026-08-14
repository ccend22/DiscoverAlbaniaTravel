// The main hub cities, hand-picked for the destinations page's "featured"
// hero grid -- kept distinct from DESTINATION_IMAGES below (which now has
// a photo for nearly every destination) so that section keeps showcasing
// these specific cities instead of whichever 6 come first alphabetically.
export const FEATURED_DESTINATION_KEYS = ["tirane", "durres", "sarande", "shkoder", "vlore", "berat"];

// Photography for every destination we have a real photo for -- the 6 main
// cities above are professionally shot; the rest are sourced from Wikimedia
// Commons (see destination-image-credits.ts for required attribution).
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

  // Sourced from Wikimedia Commons (see destination-image-credits.ts for
  // attribution -- required for CC BY / CC BY-SA reuse).
  "bajram curri": "/images/destinations/bajram-curri.jpg",
  ballsh: "/images/destinations/ballsh.jpg",
  belsh: "/images/destinations/belsh.jpg",
  bilisht: "/images/destinations/bilisht.jpg",
  bulqize: "/images/destinations/bulqize.jpg",
  burrel: "/images/destinations/burrel.jpg",
  cerrik: "/images/destinations/cerrik.jpg",
  corovode: "/images/destinations/corovode.jpg",
  delvina: "/images/destinations/delvina.jpg",
  divjake: "/images/destinations/divjake.jpg",
  dropull: "/images/destinations/dropull.jpg",
  elbasan: "/images/destinations/elbasan.jpg",
  erseke: "/images/destinations/erseke.jpg",
  fier: "/images/destinations/fier.jpg",
  finiq: "/images/destinations/finiq.jpg",
  "fushe arrez": "/images/destinations/fushe-arrez.jpg",
  "fushe kruje": "/images/destinations/fushe-kruje.jpg",
  gjirokaster: "/images/destinations/gjirokaster.jpg",
  golem: "/images/destinations/golem.jpg",
  gramsh: "/images/destinations/gramsh.jpg",
  himare: "/images/destinations/himare.jpg",
  kamez: "/images/destinations/kamez.jpg",
  kavaje: "/images/destinations/kavaje.jpg",
  kelcyre: "/images/destinations/kelcyre.jpg",
  klos: "/images/destinations/klos.jpg",
  konispol: "/images/destinations/konispol.jpg",
  koplik: "/images/destinations/koplik.jpg",
  korce: "/images/destinations/korce.jpg",
  kruje: "/images/destinations/kruje.jpg",
  krume: "/images/destinations/krume.jpg",
  kucove: "/images/destinations/kucove.jpg",
  kukes: "/images/destinations/kukes.jpg",
  lac: "/images/destinations/lac.jpg",
  leskovik: "/images/destinations/leskovik.jpg",
  lezhe: "/images/destinations/lezhe.jpg",
  libohove: "/images/destinations/libohove.jpg",
  librazhd: "/images/destinations/librazhd.jpg",
  lushnje: "/images/destinations/lushnje.jpg",
  maliq: "/images/destinations/maliq.jpg",
  mamurrasi: "/images/destinations/mamurrasi.jpg",
  manez: "/images/destinations/manez.jpg",
  memaliaj: "/images/destinations/memaliaj.jpg",
  milot: "/images/destinations/milot.jpg",
  mirdite: "/images/destinations/mirdite.jpg",
  orikum: "/images/destinations/orikum.jpg",
  patos: "/images/destinations/patos.jpg",
  peqin: "/images/destinations/peqin.jpg",
  permet: "/images/destinations/permet.jpg",
  peshkopi: "/images/destinations/peshkopi.jpg",
  pogradec: "/images/destinations/pogradec.jpg",
  polican: "/images/destinations/polican.jpg",
  prrenjas: "/images/destinations/prrenjas.jpg",
  puke: "/images/destinations/puke.jpg",
  "rinas (aeroport)": "/images/destinations/rinas-aeroport.jpg",
  roskovec: "/images/destinations/roskovec.jpg",
  rreshen: "/images/destinations/rreshen.jpg",
  rrogozhine: "/images/destinations/rrogozhine.jpg",
  rubik: "/images/destinations/rubik.jpg",
  selenice: "/images/destinations/selenice.jpg",
  shengjin: "/images/destinations/shengjin.jpg",
  shijak: "/images/destinations/shijak.jpg",
  sukth: "/images/destinations/sukth.jpg",
  tepelene: "/images/destinations/tepelene.jpg",
  "ura vajgurore": "/images/destinations/ura-vajgurore.jpg",
  "vau i dejes": "/images/destinations/vau-i-dejes.jpg",
  velipoje: "/images/destinations/velipoje.jpg",
  vore: "/images/destinations/vore.jpg",
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
