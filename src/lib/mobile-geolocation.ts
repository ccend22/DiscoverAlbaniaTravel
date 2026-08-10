export type GeolocationFailureReason =
  | "unsupported"
  | "insecure"
  | "denied"
  | "timeout"
  | "unavailable";

export class GeolocationFailure extends Error {
  constructor(public readonly reason: GeolocationFailureReason) {
    super(reason);
    this.name = "GeolocationFailure";
  }
}

function requestPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function failureReason(error: unknown): GeolocationFailureReason {
  if (!error || typeof error !== "object" || !("code" in error)) return "unavailable";
  const code = Number(error.code);
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  return "unavailable";
}

/**
 * Uses a fast, battery-friendly reading first and only asks for GPS-level
 * precision when the first attempt cannot resolve a position. This is much
 * more reliable in iOS Safari and indoors than a high-accuracy-only request.
 */
export async function getReliableCurrentPosition(): Promise<GeolocationPosition> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new GeolocationFailure("unsupported");
  }

  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  if (!window.isSecureContext && !isLocalhost) {
    throw new GeolocationFailure("insecure");
  }

  try {
    return await requestPosition({ enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  } catch (firstError) {
    const firstReason = failureReason(firstError);
    if (firstReason === "denied") throw new GeolocationFailure(firstReason);

    try {
      return await requestPosition({ enableHighAccuracy: true, timeout: 18000, maximumAge: 60000 });
    } catch (secondError) {
      throw new GeolocationFailure(failureReason(secondError));
    }
  }
}
