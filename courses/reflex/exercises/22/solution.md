# Exercise 22: expected answers

The mixed scenario runs four rules for one `expense` event. A and B post to `/ok`. C posts to `/slow?ms=15000`, which takes longer than the 10-second run timeout. D posts to `/fail?status=500`. Your trace ids and timings will differ, but you should see the same outcomes.

## 1. Slowest operation

C's `Engine.execute` span is the slowest, lasting about as long as the configured timeout of 10 seconds. The timeout runs inside the span, so it interrupts the POST before the receiver's 15-second delay is over.

The span's status is Error, with the `TimeoutError` message. C's row in `runs list` is `failed (timeout): timed out after 10s`.

## 2. Failed operation

D's `Engine.execute` span has status Error and the message `POST http://localhost:4600/fail?status=500 answered 500`. Its row is `failed (status)`, with the 500 response recorded in the error.

C failed too, by timing out. Counting both is fine as long as you tell them apart: D received an error response, while C received no response before the timeout.

## 3. Independent work completed

A and B both completed successfully. Their rows are `succeeded`, and their spans are Ok.

All four `Engine.execute` spans start within milliseconds of each other under the same `Engine.handleEvent` parent. The rules ran concurrently, with a limit of four at a time. A, B and D finished long before C, and none of them had to wait for it.

The whole request took about 10 seconds, matching the timeout rather than the sum of the four durations. You can check this in the `Engine.handleEvent` span or by measuring how long `events submit` took.

## 4. Timeout occurred

Yes, C timed out. The two places that show it are its span, which lasts about as long as the configured timeout, and its row, whose reason is `timeout`.

## Overall results

Two red spans, two Ok spans and four rows, the same as the checkpoint 21 run.
