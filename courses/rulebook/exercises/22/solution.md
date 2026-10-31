# Exercise 22: expected answers

The mixed scenario runs four rules on one `expense` event: A and B post to `/ok`, C posts to `/slow?ms=15000`, past the 10 second run timeout, and D posts to `/fail?status=500`. Your trace ids and times differ; the shape doesn't.

1. **Slowest operation.** C's `Engine.execute` span. Its duration equals the configured timeout, 10 seconds, because the timeout runs inside the span and stops the POST there. The span's status is Error with the `TimeoutError` message. C's row in `runs list` is `failed (timeout): timed out after 10s`.

2. **Failed operation.** D's `Engine.execute` span, status Error with the message `POST http://localhost:4600/fail?status=500 answered 500`. D's row is `failed (status)`, and the 500 is in its error.

3. **Independent work completed.** A's and B's rows are `succeeded` and their spans are Ok. All four `Engine.execute` spans start within milliseconds of each other, under the same `Engine.handleEvent` parent: the event ran them at once, at most four at a time. A, B and D finished long before C; nothing waited for C. The whole request (the `Engine.handleEvent` span, and the time `events submit` took) is about 10 seconds, the timeout, not the sum of the four.

4. **Timeout fired.** Yes, for C. Two places show it: C's span lasts as long as the timeout, and its row's reason is `timeout`.

Two red spans, two Ok, four rows: the same numbers as the lesson 21 checkpoint.
