import { setOptions } from "@googlemaps/js-api-loader";

// Shared across every component that touches the Maps JS API (location
// picker, stations map, inline autocomplete fields) so `setOptions` is only
// ever called once per page, regardless of how many of them mount.
let optionsSet = false;
export function ensureGoogleMapsOptions() {
  if (optionsSet) return;
  setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "", v: "weekly" });
  optionsSet = true;
}

export const hasGoogleMapsApiKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

/**
 * Places Autocomplete decides above-vs-below placement itself based on
 * remaining viewport space, and gets it wrong inside modals and shorter
 * viewports — flipping the suggestion list up over the field the user is
 * typing into. Google recalculates its own inline `top`/`bottom` on every
 * keystroke, so a static CSS rule can't win it; this re-pins the container
 * below the input (with `!important`, the only thing that outranks an
 * inline style) every time Google's own script touches it.
 *
 * Google creates every bound field's `.pac-container` up front (not lazily
 * on first keystroke), so with two Autocomplete fields on one page, "the
 * last `.pac-container` in the DOM" is just whichever mounted last — not
 * necessarily this input's own. The one reliable signal is *visibility*:
 * Google only shows the container for whichever field is actually being
 * typed into, so this claims whichever `.pac-container` is currently
 * visible at the moment this input fires its own "input" event.
 */
export function pinAutocompleteDropdownBelow(input: HTMLInputElement): () => void {
  let container: HTMLElement | null = null;
  let styleObserver: MutationObserver | null = null;

  // The style observer below watches this same element for style-attribute
  // changes, so writing to its style unconditionally would retrigger itself
  // forever. Comparing against the container's *current* inline values (not
  // a remembered "last computed" signature) breaks the loop while still
  // correcting things again if Google's own script later overwrites us.
  function reposition() {
    if (!container) return;
    const rect = input.getBoundingClientRect();
    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const viewportBottom = viewportTop + viewportHeight;

    let top: string;
    let left: string;
    let width: string;
    let maxHeight: string;

    if (isMobile) {
      // Keep the suggestion surface inside the *visual* viewport (the area
      // above the software keyboard). A fixed target height prevents Google
      // from repeatedly flipping the list above/below the field as results
      // change, which otherwise makes the whole page appear to jump.
      const horizontalInset = 12;
      const panelHeight = Math.min(256, Math.max(156, viewportHeight * 0.42));
      const belowTop = rect.bottom + 8;
      const availableBelow = viewportBottom - belowTop - 12;
      const stableTop =
        availableBelow >= panelHeight
          ? belowTop
          : Math.max(viewportTop + 12, rect.top - panelHeight - 8);
      top = `${stableTop}px`;
      left = `${viewportLeft + horizontalInset}px`;
      width = `${Math.max(0, viewportWidth - horizontalInset * 2)}px`;
      maxHeight = `${Math.max(120, viewportBottom - stableTop - 12)}px`;
      container.dataset.mobilePlaces = "true";
    } else {
      top = `${rect.bottom + 8}px`;
      left = `${rect.left}px`;
      width = `${rect.width}px`;
      maxHeight = "none";
      delete container.dataset.mobilePlaces;
    }

    if (
      container.style.position === "fixed" &&
      container.style.top === top &&
      container.style.left === left &&
      container.style.width === width &&
      container.style.bottom === "auto" &&
      container.style.maxHeight === maxHeight &&
      container.style.marginTop === "0px"
    ) {
      return;
    }
    container.style.setProperty("position", "fixed", "important");
    container.style.setProperty("top", top, "important");
    container.style.setProperty("left", left, "important");
    container.style.setProperty("width", width, "important");
    container.style.setProperty("bottom", "auto", "important");
    container.style.setProperty("max-height", maxHeight, "important");
    container.style.setProperty("margin-top", "0", "important");
  }

  function claimContainer(): boolean {
    if (container) {
      reposition();
      return true;
    }
    const containers = document.querySelectorAll<HTMLElement>(".pac-container");
    const found = Array.from(containers).find((el) => el.getBoundingClientRect().height > 0);
    if (!found) return false;
    container = found;
    styleObserver = new MutationObserver(reposition);
    styleObserver.observe(container, { attributes: true, attributeFilter: ["style"] });
    reposition();
    return true;
  }

  // Predictions come from an async request to Google's servers, so the
  // container doesn't necessarily size itself within the next frame the way
  // a synchronous re-render would -- polling for a bit after each keystroke
  // (instead of a single rAF check) accounts for that network round-trip,
  // otherwise a fast typer or a slow response can leave the container
  // permanently unclaimed and stuck on Google's own unpinned positioning,
  // which doesn't avoid the on-screen keyboard on mobile.
  let pollTimeout = 0;
  function handleActivity() {
    window.clearTimeout(pollTimeout);
    const deadline = Date.now() + 1500;
    function poll() {
      if (claimContainer() || Date.now() > deadline) return;
      pollTimeout = window.setTimeout(poll, 80);
    }
    poll();
  }

  input.addEventListener("input", handleActivity);
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);
  window.visualViewport?.addEventListener("resize", reposition);
  window.visualViewport?.addEventListener("scroll", reposition);

  return () => {
    window.clearTimeout(pollTimeout);
    input.removeEventListener("input", handleActivity);
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition, true);
    window.visualViewport?.removeEventListener("resize", reposition);
    window.visualViewport?.removeEventListener("scroll", reposition);
    styleObserver?.disconnect();
  };
}
