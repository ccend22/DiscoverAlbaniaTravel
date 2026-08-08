import { HeaderChrome } from "./header-chrome";
import { getLocaleAndDictionary } from "@/lib/i18n";

export async function SiteHeader() {
  const { locale, dict } = await getLocaleAndDictionary();

  const primaryLinks = [
    { href: "/", label: dict.nav.home },
    { href: "/destinations", label: dict.nav.destinations },
    { href: "/stations", label: dict.nav.stations },
    { href: "/routes", label: dict.nav.routes },
    { href: "/news", label: dict.nav.news },
  ];
  const utilityLinks = [{ href: "/account", label: dict.nav.myAccount }];

  return (
    <HeaderChrome
      primaryLinks={primaryLinks}
      utilityLinks={utilityLinks}
      locale={locale}
      openMenuLabel={dict.nav.openMenu}
    />
  );
}
