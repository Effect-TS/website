import { Effect, Context, Console, Runtime, FiberRefs } from "effect"

class LoggingService extends Context.Tag("LoggingService")<
  LoggingService,
  {
    log: (line: string) => Effect.Effect<void>
  }
>() {}

class EmailService extends Context.Tag("EmailService")<
  EmailService,
  {
    send: (user: string, content: string) => Effect.Effect<void>
  }
>() {}

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

// $ExpectType Effect<void, never, LoggingService | EmailService>
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
