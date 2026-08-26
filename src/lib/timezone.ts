const ALBANIA_TIME_ZONE = "Europe/Tirane";

export function albaniaLocalDateTimeToDate(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: ALBANIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value])
    );
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    );
    guess += target - represented;
  }

  return new Date(guess);
}

export function formatAlbaniaDateTime(value: Date, locale: "en" | "al" = "en"): string {
  return new Intl.DateTimeFormat(locale === "al" ? "sq-AL" : "en-GB", {
    timeZone: ALBANIA_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function getAlbaniaDateInputValue(value = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ALBANIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getAlbaniaTimeInputValue(value = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ALBANIA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value);
}
