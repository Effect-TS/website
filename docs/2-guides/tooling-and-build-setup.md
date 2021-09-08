## Notes on bundling

- The Effect module is stateful so make sure to only bundle it once as part of your application.
  - when having multiple build/bundle steps (e.g. for plugin systems) make sure to mark `@effect-ts/*` as an external
