---
title: Handling Errors
---

Just like any other program, Effect programs may fail for expected or unexpected reasons. The difference between a non-Effect program and an Effect program is in the detail provided to you when your program fails. Effect attempts to preserve as much information as possible about what caused your program to fail to produce a detailed, comprehensive, and human readable failure message.

In this section, you will learn:

  - The possible ways an Effect program can fail
  - How Effect represents the cause of an error
  - The tools Effect provides for robust and comprehensive error management

## Possible Causes for Failure

In an Effect program, there are three possible ways for a program to fail:

  1. Expected Errors
  2. Unexpected Errors
  3. Interruption

### Expected Errors

Expected errors, also known as _failures_, _typed errors_ or _recoverable errors_, are errors that the developer expects to happen as part of normal program execution. These errors are similar in spirit to checked exceptions and should be part of a program's domain and control flow.

Expected errors are also tracked at the type level by the `Effect` data type in the `Error` channel.

### Unexpected Errors

Unexpected errors, also known as _defects_, _untyped errors_ or _unrecoverable errors_, are errors that the developer does not expect to happen as part of normal program execution. These errors are similar in spirit to unchecked exceptions and are not part of a program's domain or control flow.

Because these errors are not expected to happen, Effect does not track them at the type level. However, the Effect runtime does keep track of these errors (see [Representing Errors with Cause](#representing-errors-with-cause) below) and provides several methods which facilitate recovering from unexpected errors.

### Interruption

Interruption errors are caused by interrupting execution of a running fiber. For a more comprehensive overview of Effect's fiber runtime and interruption model, please see [INSERT LINK HERE](index.md).

## Representing Errors with Cause

