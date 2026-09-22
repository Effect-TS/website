export const mailboxDuration = 28

export const mailboxSteps = [
  {
    at: 0,
    label: "An empty map",
    explanation:
      "No workers are running yet. Each recruiter reply handler has its own scope.",
  },
  {
    at: 1,
    label: "get(alice)",
    explanation:
      "Recruiter A's reply handler asks the map for Alice's Ghostwriter worker.",
  },
  {
    at: 2.2,
    label: "Create on first access",
    explanation:
      "Alice's key is missing. RcMap runs lookup(alice), creating a queue and starting a worker fiber.",
  },
  {
    at: 3.4,
    label: "Worker started",
    explanation:
      "lookup returns the running worker. A can submit replies to its queue, with one reference held by A's scope.",
  },
  {
    at: 5,
    label: "get(alice), again",
    explanation:
      "Recruiter B's reply handler asks for the same mailbox key in a separate scope.",
  },
  {
    at: 6.2,
    label: "Reuse the worker",
    explanation:
      "Alice's entry already exists. RcMap returns the same worker without calling lookup again. Two references, one running fiber.",
  },
  {
    at: 8,
    label: "get(bob)",
    explanation:
      "Recruiter C's reply handler asks for Bob's mailbox. This is a different key.",
  },
  {
    at: 9.2,
    label: "Another key, another lookup",
    explanation:
      "Bob's key is missing, so lookup(bob) starts a separate worker. Alice's worker is unaffected.",
  },
  {
    at: 10.4,
    label: "Two workers",
    explanation:
      "C receives Bob's new worker. Alice has two references; Bob has one. Three callers share two running workers.",
  },
  {
    at: 13,
    label: "A finishes",
    explanation:
      "A's scope closes and its reference is released. Alice's reference count falls from two to one. Her worker keeps running for B.",
  },
  {
    at: 17,
    label: "C finishes",
    explanation:
      "C's scope closes. Bob's reference count reaches zero and his worker starts shutting down. Alice's worker keeps running.",
  },
  {
    at: 18.2,
    label: "Bob's worker stopped",
    explanation:
      "Bob's worker has stopped. Alice's worker is still running for B.",
  },
  {
    at: 19,
    label: "Bob's resource released",
    explanation: "Bob's worker has been released. Only Alice's worker remains.",
  },
  {
    at: 21,
    label: "B finishes",
    explanation:
      "B's scope closes. Alice's reference count reaches zero and her worker starts shutting down.",
  },
  {
    at: 22.2,
    label: "All workers stopped",
    explanation:
      "Alice's worker has stopped. Its resource can now be released.",
  },
  {
    at: 23,
    label: "All resources released",
    explanation:
      "Both workers and their queues have been released. The map is empty again.",
  },
] as const

const jobs = [
  {
    id: "A",
    mailbox: "alice",
    request: 1,
    arrival: 2.2,
    ready: 3.4,
    end: 13,
  },
  {
    id: "B",
    mailbox: "alice",
    request: 5,
    arrival: 6.2,
    ready: 6.2,
    end: 21,
  },
  {
    id: "C",
    mailbox: "bob",
    request: 8,
    arrival: 9.2,
    ready: 10.4,
    end: 17,
  },
] as const

export function mailboxFrame(time: number) {
  const currentJobs = jobs.map((job) => ({
    ...job,
    state:
      time < job.request
        ? ("waiting" as const)
        : time < job.arrival
          ? ("requesting" as const)
          : time < job.ready
            ? ("acquiring" as const)
            : time < job.end
              ? ("active" as const)
              : ("done" as const),
  }))
  const workers = (["alice", "bob"] as const).map((mailbox) => {
    const consumers = currentJobs.filter((job) => job.mailbox === mailbox)
    const references = consumers.filter(
      (job) => job.state === "active" || job.state === "acquiring",
    ).length
    const lastRelease = Math.max(...consumers.map((job) => job.end))
    const decrementAt = consumers.find(
      (job) => time >= job.end && time < job.end + 1,
    )?.end
    return {
      mailbox,
      references,
      decrementAt,
      reused: mailbox === "alice" && time >= 6.2 && time < 8,
      state: consumers.some((job) => job.state === "acquiring")
        ? ("starting" as const)
        : references > 0
          ? ("running" as const)
          : consumers.some((job) => job.state === "done")
            ? time < lastRelease + 1.2
              ? ("stopping" as const)
              : time < lastRelease + 2
                ? ("stopped" as const)
                : ("closed" as const)
            : ("missing" as const),
    }
  })
  const step = mailboxSteps.reduce(
    (current, candidate, index) => (time >= candidate.at ? index : current),
    0,
  )
  return {
    jobs: currentJobs,
    workers,
    step,
  }
}
