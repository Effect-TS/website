/** Blog author ids that appear in the "Talk to the Effect team" menu, in order. */
export const CONTACT_MEMBER_IDS = [
  "michael_arnaldi",
  "maxwell_brown",
  "sebastian_lorenz",
  "tim_smart",
] as const

/** Google Calendar appointment schedule id per member. A member without one cannot be booked yet. */
export const SCHEDULE_IDS: Readonly<
  Record<(typeof CONTACT_MEMBER_IDS)[number], string | undefined>
> = {
  michael_arnaldi: undefined,
  maxwell_brown: undefined,
  sebastian_lorenz: undefined,
  tim_smart: undefined,
}

export const scheduleUrl = (scheduleId: string) =>
  `https://calendar.google.com/calendar/appointments/schedules/${scheduleId}?gv=true`
