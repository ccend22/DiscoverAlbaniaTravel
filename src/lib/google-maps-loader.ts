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
    const top = `${rect.bottom + 8}px`;
    const left = `${rect.left}px`;
    const width = `${rect.width}px`;
    if (
      container.style.position === "fixed" &&
      container.style.top === top &&
      container.style.left === left &&
      container.style.width === width &&
      container.style.bottom === "auto"
    ) {
      return;
    }
    container.style.setProperty("position", "fixed", "important");
    container.style.setProperty("top", top, "important");
    container.style.setProperty("left", left, "important");
    container.style.setProperty("width", width, "important");
    container.style.setProperty("bottom", "auto", "important");
  }

  function claimContainer() {
    if (container) {
      reposition();
      return;
    }
    const containers = document.querySelectorAll<HTMLElement>(".pac-container");
    const found = Array.from(containers).find((el) => el.getBoundingClientRect().height > 0);
    if (!found) return;
    container = found;
    styleObserver = new MutationObserver(reposition);
    styleObserver.observe(container, { attributes: true, attributeFilter: ["style"] });
    reposition();
  }

  // Google shows (and first sizes) the container synchronously within its
  // own "input" handling, so give that a frame to finish before grabbing it.
  function handleActivity() {
    requestAnimationFrame(claimContainer);
  }

  input.addEventListener("input", handleActivity);
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);

  return () => {
    input.removeEventListener("input", handleActivity);
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition, true);
    styleObserver?.disconnect();
  };
}
