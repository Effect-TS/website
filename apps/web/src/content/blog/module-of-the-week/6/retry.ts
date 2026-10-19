// The story the retry visuals step through, shared so they say the same
// thing. Sebastian posts, Slack sends the message to our server and waits
// three seconds to hear back, and our server saves the message before it
// replies. The save is slow, so Slack gives up and sends the message again,
// and both copies end up in the message table.

// What each step says, under the visual
export const STEPS = [
  "Sebastian posts a question in #engineering",
  "Slack sends it to our server, and waits up to 3 seconds to hear back",
  "Our server saves the message before it replies, and today the database is slow",
  "3 seconds and no reply, so Slack assumes the message got lost and sends it again",
  "The first save finishes, and our reply reaches Slack too late",
  "The copy is saved too, so the table has the same message twice",
] as const

// The step where each thing happens
export const AT = {
  post: 0,
  send: 1,
  save: 2,
  retry: 3,
  late: 4,
  copy: 5,
} as const

// Shows everything in `root` whose step has come: anything with a
// `data-at` step at or before `k`
export const reveal = (root: HTMLElement, k: number) => {
  for (const el of root.querySelectorAll<HTMLElement>("[data-at]")) {
    el.classList.toggle("is-on", Number(el.dataset.at) <= k)
    el.classList.toggle("is-now", Number(el.dataset.at) === k)
  }
}
