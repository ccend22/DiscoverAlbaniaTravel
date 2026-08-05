import type { TouchEvent } from "react";

/**
 * Spread onto any element whose tap should close/dismiss an overlay. A real
 * touch tap already fires `click` correctly — but when that click unmounts
 * the tapped element (revealing different page content underneath at the
 * same screen point, e.g. the button that opened the overlay), the
 * browser's touch-to-mouse compatibility event replay can land a delayed
 * "ghost click" there and immediately reopen or retrigger it. preventDefault
 * on touchend suppresses that replay; onClick alone still covers
 * mouse-only input, which never fires touchend.
 */
export function tapToDismiss(action: () => void) {
  return {
    onClick: action,
    onTouchEnd: (event: TouchEvent) => {
      event.preventDefault();
      action();
    },
  };
}
