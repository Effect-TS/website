import { Effect, Context, Console, Runtime, FiberRefs } from "effect"

interface LoggingService {
  log: (line: string) => Effect.Effect<never, never, void>
}

const LoggingService = Context.Tag<LoggingService>()

interface EmailService {
  send: (user: string, content: string) => Effect.Effect<never, never, void>
}

const EmailService = Context.Tag<EmailService>()

const LoggingServiceLive = LoggingService.of({
  log: Console.log
})

const EmailServiceFake = EmailService.of({
  send: (user, content) => Console.log(`sending email to ${user}: ${content}`)
})

// $ExpectType Runtime<LoggingService | EmailService>
const testableRuntime = Runtime.make({
  context: Context.make(LoggingService, LoggingServiceLive).pipe(
    Context.add(EmailService, EmailServiceFake)
  ),
  fiberRefs: FiberRefs.empty(),
  runtimeFlags: Runtime.defaultRuntimeFlags
})

// $ExpectType Effect<LoggingService | EmailService, never, void>
const program = Effect.gen(function* (_) {
  const { log } = yield* _(LoggingService)
  const { send } = yield* _(EmailService)
  yield* _(log("sending newsletter"))
  yield* _(send("David", "Hi! Here is today's newsletter."))
})

Runtime.runPromise(testableRuntime)(program)
/*
Output:
sending newsletter
sending email to David: Hi! Here is today's newsletter.
*/
