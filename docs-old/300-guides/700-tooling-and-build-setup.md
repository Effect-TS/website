---
title: Tooling
---

## Notes on bundling

- The Effect module is stateful so make sure to only bundle it once as part of your application.
  - when having multiple build/bundle steps (e.g. for plugin systems) make sure to mark `@effect-ts/*` as an external

### TypeScript

- Use `"strict": true` if possible.
  - effect does not work without `strictFunctionTypes`, if you have that turned off you can expect to have undetected errors everywhere. In my experience it is counterproductive to even use effect in that context because errors won't be noticed by the compiler and it will be extremely hard to spot them. The remaining strict flags are a nice to have but not strictly needed
  - for context in TypeScript `strictFunctionTypes` is the flag responsible for enabling implicit variance, without that any type parameter is considered bivariant and things like input of functions merge with `&` or output of functions merge with `|` are false in that context
