const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
})

/** `2026-09-20` -> `Sep 20, 2026`. */
export const formatReleaseDate = (date: string): string =>
  dateFormat.format(new Date(`${date}T00:00:00Z`))
