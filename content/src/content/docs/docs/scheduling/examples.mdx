---
title: Examples
description: Explore practical examples for scheduling, retries, timeouts, and periodic task execution in Effect.
sidebar:
  order: 4
---

## Making API Calls and Handling Timeouts

When making API calls to third-party services, we may want to enforce timeouts and retry mechanisms.
In this example, the API call is set to retry a maximum of two times in case of failure, and the entire operation will be interrupted if it takes longer than 4 seconds.

```ts twoslash
import { Console, Effect } from "effect"

// Function to make the API call
const getJson = (url: string) =>
  Effect.tryPromise(() =>
    fetch(url).then((res) => {
      if (!res.ok) {
        console.log("error")
        throw new Error(res.statusText)
      }
      console.log("ok")
      return res.json() as unknown
    })
  )

// Program that retries the API call twice,
// times out after 4 seconds, and logs errors
const program = (url: string) =>
  getJson(url).pipe(
    Effect.retry({ times: 2 }),
    Effect.timeout("4 seconds"),
    Effect.catchAll(Console.error)
  )

// Test the successful case
Effect.runFork(program("https://dummyjson.com/products/1?delay=1000"))
/*
Output:
ok
*/

// Test case: timeout scenario
Effect.runFork(program("https://dummyjson.com/products/1?delay=5000"))
/*
Output:
TimeoutException: Operation timed out before the specified duration of '4s' elapsed
*/

// Test case: API error handling
Effect.runFork(program("https://dummyjson.com/auth/products/1?delay=500"))
/*
Output:
error
error
error
UnknownException: An unknown error occurred
*/
```

## Implementing Conditional Retries

Sometimes, we need to retry a failed API call only for specific error conditions, such as certain HTTP status codes.

```ts twoslash
import { Console, Effect } from "effect"

// Custom error class for handling status codes
class Err extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

// Function to make the API call
const getJson = (url: string) =>
  Effect.tryPromise({
    try: () =>
      fetch(url).then((res) => {
        if (!res.ok) {
          console.log(res.status)
          throw new Err(res.statusText, res.status)
        }
        return res.json() as unknown
      }),
    catch: (e) => e as Err
  })

// Program that retries only for 401 status codes
const program = (url: string) =>
  getJson(url).pipe(
    Effect.retry({ while: (err) => err.status === 401 }),
    Effect.catchAll(Console.error)
  )

// Test the 401 scenario
Effect.runFork(
  program("https://dummyjson.com/auth/products/1?delay=1000")
)
/*
Output:
401
401
401
401
...
*/

// Test the 404 scenario
Effect.runFork(program("https://dummyjson.com/-"))
/*
Output:
404
Err [Error]: Not Found
*/
```

## Running Scheduled Effects Until Completion

Sometimes, we need to run a task periodically until a longer-running task completes. This is common in scenarios like polling or periodic status logging.

```ts twoslash
import { Effect, Console, Schedule } from "effect"

const longRunningEffect = Console.log("done").pipe(
  Effect.delay("5 seconds")
)

const action = Console.log("action...")

const schedule = Schedule.fixed("1.5 seconds")

const program = Effect.race(
  Effect.repeat(action, schedule),
  longRunningEffect
)

Effect.runPromise(program)
/*
Output:
action...
action...
action...
action...
done
*/
```
