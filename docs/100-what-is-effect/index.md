---
title: What is Effect
---

`Effect` brings together years of learnings and research on productive, safe, and concurrent programming, it is a TypeScript library modelled after `ZIO` in `Scala` and it aims to make it simple to develop complex things while not making it hard to build simple things.

The core engine of `Effect` is a `Fiber`-based runtime, you may have heard of Fibers before, for example the new React uses Fibers to improve rendering behaviour.

The Effect data-type, that serves as a backbone for all the modules of `@effect/core`, has 3 type parameters, the first representing the `Context` available to your program (think of it like the React context), the second representing the `Errors` that your program may encounter while executing and finally the third one representing the `Result` of running the task in case of success.

## What's in the Box?

When looking into Effect you'll find a rich set of modules to deal with much more than what we've seen, just in `@effect/core` you'll find:

- `Effect`: Generic Program Definition
- `Cause`: Representing potentially multiple failure causes of different kinds
- `Scope`: Safe Resource Management to model things like database connections
- `Fiber`: Low Level Concurrency Primitives
- `Queue`: Work-Stealing Concurrent & Backpressured Queues
- `Hub`: Like a Pub/Sub for Effects
- `Layer`: Context Construction
- `Metrics`: Prometheus Compatible Metrics
- `Tracing`: OpenTelemetry Compatible Tracing
- `Logger`: Multi-Level & Abstract Logger
- `Ref`: Mutable Reference to immutable State with potentially Syncronized access and updates
- `Schedule`: Time-based Scheduling Policies
- `Stream`: Pull Based Effectful Streams (like an Effect that can produce 0 - infinite values)
- `Deferred`: Like a Promise of an Effect that may be fulfilled at a later point
- `STM`: Transactional Data Structures & Coordination 
- `Semaphore`: Concurrency Control
- `Clock`: System Clock & Time Utilities
- `Random`: Deterministic Seeded Random Utilities
- `Runtime`: Runtime Configuration and Runner
- `Supervisor`: Fiber Monitoring