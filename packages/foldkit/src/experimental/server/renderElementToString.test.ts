import { Effect, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { __htmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { renderElementToString } from './server.js'

const Message = defineMessageUnion({ Clicked: {} })
type Message = typeof Message.Type

const Flags = Schema.Struct({ start: Schema.Number })

const h = __htmlBuilder<Message>()

const BUILD_ID = 'test-build-id'

const config = {
  Flags,
  init: (flags: typeof Flags.Type) => ({ model: flags.start }),
  view: (model: number) => h.div([], [String(model)]),
}

describe('renderElementToString', () => {
  it('stamps the root as an Element with its runtime id and build id', async () => {
    const rendered = await Effect.runPromise(
      renderElementToString(config, {
        flags: { start: 3 },
        buildId: BUILD_ID,
        runtimeId: 'program-1',
      }),
    )

    expect(rendered.html).toContain('data-foldkit-app="program-1"')
    expect(rendered.html).toContain('data-foldkit-element')
    expect(rendered.html).toContain(BUILD_ID)
    expect(rendered.html).toContain('>3<')
  })

  it('returns only html, with no Document fields', async () => {
    const rendered = await Effect.runPromise(
      renderElementToString(config, {
        flags: { start: 3 },
        buildId: BUILD_ID,
      }),
    )

    expect(Object.keys(rendered)).toEqual(['html'])
  })

  it('carries the Flags payload for a hydratable render', async () => {
    const rendered = await Effect.runPromise(
      renderElementToString(config, {
        flags: { start: 3 },
        buildId: BUILD_ID,
      }),
    )

    expect(rendered.html).toContain('<script')
  })

  it('renders static markup with no stamp when isHydratable is false', async () => {
    const rendered = await Effect.runPromise(
      renderElementToString(
        {
          init: () => ({ model: 1 }),
          view: (model: number) => h.div([], [String(model)]),
        },
        { isHydratable: false },
      ),
    )

    expect(rendered.html).not.toContain('data-foldkit')
  })

  it('refuses an empty runtime id', async () => {
    const result = await Effect.runPromise(
      Effect.flip(
        renderElementToString(config, {
          flags: { start: 3 },
          buildId: BUILD_ID,
          runtimeId: '',
        }),
      ),
    )

    expect(result._tag).toBe('InvalidRuntimeId')
  })
})
