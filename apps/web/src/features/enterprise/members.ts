/** Team members offered in the "Talk to the Effect team" menu, in order. */
export const CONTACT_MEMBERS: ReadonlyArray<{
  /** Blog author id. Name, title, timezone and avatar come from the author. */
  readonly id: string
  /** Google Calendar appointment schedule id of the member's booking page. */
  readonly scheduleId: string
}> = [
  { id: "michael_arnaldi", scheduleId: "TODO" },
  { id: "maxwell_brown", scheduleId: "TODO" },
  { id: "sebastian_lorenz", scheduleId: "TODO" },
  { id: "tim_smart", scheduleId: "TODO" },
]

export const scheduleUrl = (scheduleId: string) =>
  `https://calendar.google.com/calendar/appointments/schedules/${scheduleId}?gv=true`
