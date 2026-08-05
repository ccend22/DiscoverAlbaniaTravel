// Some browser extensions mark interactive elements with `data-has-listeners`
// (often asynchronously, and again on every newly mounted element) before or
// during React hydration. A one-time sweep loses that race for any element
// tagged after the sweep runs, which is why the hydration mismatch kept
// resurfacing on different forms. A standing observer wins the race for the
// lifetime of the page instead of needing a suppressHydrationWarning on every
// input across the app.
function stripListenerMarker(node: Node) {
  if (node instanceof Element) {
    if (node.hasAttribute("data-has-listeners")) node.removeAttribute("data-has-listeners");
    node.querySelectorAll("[data-has-listeners]").forEach((el) => el.removeAttribute("data-has-listeners"));
  }
}

stripListenerMarker(document.documentElement);

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === "attributes") {
      (mutation.target as Element).removeAttribute("data-has-listeners");
    } else {
      mutation.addedNodes.forEach(stripListenerMarker);
    }
  }
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-has-listeners"],
  childList: true,
  subtree: true,
});
