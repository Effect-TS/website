import { Effect, Fiber, Schema } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  renderElementToString,
  renderToString,
} from '../experimental/server/server.js'
import type { Document } from '../html/index.js'
import { __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import type * as Update from '../update/index.js'
import { makeApplication } from './makeApplication.js'
import { makeElement } from './makeElement.js'
import { __startProgram } from './start.js'

const Message = defineMessageUnion({ ClickedIncrement: {} })
type Message = typeof Message.Type

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const Flags = Schema.Struct({ start: Schema.Number })
type Flags = typeof Flags.Type

const h = __htmlBuilder<Message>()

const BUILD_ID = 'test-build-id'

const init = (flags: Flags): Update.Return<Model, Message> => ({
  model: Model.make({ count: flags.start }),
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedIncrement: () => ({ model: Model.make({ count: model.count + 1 }) }),
  })

const view = (model: Model): Document => ({
  title: `Count ${model.count}`,
  body: h.div(
    [],
    [
      h.button([h.Class('bump'), h.OnClick(Message.ClickedIncrement())], ['+']),
      h.span([h.Class('count')], [String(model.count)]),
    ],
  ),
})

const serverConfig = { Flags, init, view }
const elementServerConfig = {
  Flags,
  init,
  view: (model: Model) => view(model).body,
}

const renderRoot = (
  runtimeId: string,
  start: number,
  options?: Readonly<{ isElement?: boolean; buildId?: string }>,
): Promise<string> => {
  const renderOptions = {
    flags: { start },
    buildId: options?.buildId ?? BUILD_ID,
    runtimeId,
  }
  return Effect.runPromise(
    options?.isElement === false
      ? renderToString(serverConfig, renderOptions)
      : renderElementToString(elementServerConfig, renderOptions),
  ).then(rendered => rendered.html)
}

const mountPage = (...sections: ReadonlyArray<string>): void => {
  document.body.innerHTML = sections
    .map((html, index) => `<section id="slot-${index}">${html}</section>`)
    .join('')
}

const rootOf = (id: string): HTMLElement => {
  const root = document.querySelector<HTMLElement>(`[data-foldkit-app="${id}"]`)
  if (root === null) {
    throw new Error(`no root ${id}`)
  }
  return root
}

const countIn = (root: Element): string | null | undefined =>
  root.querySelector('.count')?.textContent

const makeFlagsElement = (container: HTMLElement) =>
  makeElement({
    Model,
    Flags,
    flags: Effect.die(new Error('flags come from the server payload')),
    init,
    update,
    view: model => view(model).body,
    container,
  })

const startElement = (container: HTMLElement) =>
  Effect.runFork(
    __startProgram(
      makeFlagsElement(container),
      undefined,
      'Hydrate',
      undefined,
      BUILD_ID,
    ),
  )

afterEach(() => {
  document.body.innerHTML = ''
  document.body.inert = false
  document.body.removeAttribute('inert')
  document.body.removeAttribute('aria-hidden')
  document.body.removeAttribute('data-foldkit-refused')
  document
    .querySelectorAll('[data-foldkit-refusal-shield]')
    .forEach(shield => shield.remove())
})

describe('server render of an Element', () => {
  it('stamps data-foldkit-element beside the app stamp', async () => {
    const html = await renderRoot('program-1', 1)
    expect(html).toContain('data-foldkit-app="program-1"')
    expect(html).toContain('data-foldkit-element=""')
    expect(html).toContain('data-foldkit-flags="program-1"')
  })

  it('leaves the stamp off an Application root', async () => {
    const html = await renderRoot('foldkit', 1, { isElement: false })
    expect(html).toContain('data-foldkit-app="foldkit"')
    expect(html).not.toContain('data-foldkit-element')
  })
})

describe('server render guards', () => {
  it('refuses a view that authors the Element stamp', async () => {
    const error = await Effect.runPromise(
      Effect.flip(
        renderToString(
          {
            Flags,
            init,
            view: (model: Model): Document => ({
              title: '',
              body: h.div(
                [h.Attribute('data-foldkit-element', '')],
                [String(model.count)],
              ),
            }),
          },
          { flags: { start: 1 }, buildId: BUILD_ID },
        ),
      ),
    )
    expect(String((error as { cause?: unknown }).cause)).toContain(
      'data-foldkit-element',
    )
  })
})

describe('hydrating several Elements in one document', () => {
  it('adopts each root and keeps their state apart', async () => {
    mountPage(
      await renderRoot('program-1', 1),
      await renderRoot('program-2', 10),
    )
    const first = rootOf('program-1')
    const second = rootOf('program-2')
    const firstCount = first.querySelector('.count')
    const secondCount = second.querySelector('.count')

    const fibers = [startElement(first), startElement(second)]

    try {
      first
        .querySelector('.bump')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await vi.waitFor(() => {
        expect(countIn(first)).toBe('2')
      })
      expect(countIn(second)).toBe('10')
      expect(first.querySelector('.count')).toBe(firstCount)
      expect(second.querySelector('.count')).toBe(secondCount)
    } finally {
      await Effect.runPromise(Fiber.interruptAll(fibers))
    }
  })

  it('adopts the stamped roots without a hydration mismatch warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mountPage(
      await renderRoot('program-1', 1),
      await renderRoot('program-2', 2),
    )
    const roots = [rootOf('program-1'), rootOf('program-2')]
    const fibers = roots.map(startElement)
    try {
      await vi.waitFor(() => {
        expect(
          roots.every(root => !root.hasAttribute('data-foldkit-app')),
        ).toBe(true)
      })
      expect(
        roots.every(root => !root.hasAttribute('data-foldkit-element')),
      ).toBe(true)
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
      await Effect.runPromise(Fiber.interruptAll(fibers))
    }
  })

  it('does not set the document title', async () => {
    document.title = 'Host'
    mountPage(await renderRoot('program-1', 1))
    const root = rootOf('program-1')
    const fiber = startElement(root)
    try {
      await vi.waitFor(() => {
        expect(root.hasAttribute('data-foldkit-app')).toBe(false)
      })
      expect(countIn(root)).toBe('1')
      expect(document.title).toBe('Host')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('still lets one Application share the page with Elements', async () => {
    mountPage(
      await renderRoot('foldkit', 5, { isElement: false }),
      await renderRoot('program-1', 1),
    )
    const applicationRoot = rootOf('foldkit')
    const elementRoot = rootOf('program-1')
    const application = makeApplication({
      Model,
      Flags,
      init,
      update,
      view,
      container: applicationRoot,
    })
    const fibers = [
      Effect.runFork(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
      startElement(elementRoot),
    ]
    try {
      await vi.waitFor(() => {
        expect(document.title).toBe('Count 5')
      })
      expect(countIn(applicationRoot)).toBe('5')
      expect(countIn(elementRoot)).toBe('1')
      expect(document.body.hasAttribute('data-foldkit-refused')).toBe(false)
    } finally {
      await Effect.runPromise(Fiber.interruptAll(fibers))
    }
  })
})

describe('refusing an Element', () => {
  it('contains only the refused root when its build differs', async () => {
    mountPage(
      await renderRoot('program-1', 1, { buildId: 'other-build' }),
      await renderRoot('program-2', 10),
    )
    const refused = rootOf('program-1')
    const healthy = rootOf('program-2')

    const fibers = [startElement(refused), startElement(healthy)]

    try {
      await vi.waitFor(() => {
        expect(refused.hasAttribute('data-foldkit-refused')).toBe(true)
      })
      expect(refused.getAttribute('aria-hidden')).toBe('true')
      expect(refused.inert).toBe(true)
      expect(document.body.hasAttribute('data-foldkit-refused')).toBe(false)
      expect(document.body.inert).toBe(false)
      expect(healthy.hasAttribute('data-foldkit-refused')).toBe(false)
      await vi.waitFor(() => {
        expect(countIn(healthy)).toBe('10')
      })
    } finally {
      await Effect.runPromise(Fiber.interruptAll(fibers))
    }
  })

  it('contains the page when an Element container is an Application root', async () => {
    mountPage(await renderRoot('foldkit', 1, { isElement: false }))
    expect(() => makeFlagsElement(rootOf('foldkit'))).toThrow(
      'whose container is the root of a page-owning application',
    )
    expect(document.body.hasAttribute('data-foldkit-refused')).toBe(true)
  })

  it('throws when two roots share a runtime id', async () => {
    mountPage(
      await renderRoot('program-1', 1),
      await renderRoot('program-1', 2),
    )
    const container = document.querySelector<HTMLElement>(
      '[data-foldkit-app="program-1"]',
    )
    expect(container).not.toBeNull()
    expect(() => makeFlagsElement(container as HTMLElement)).toThrow()
  })
})

describe('a client-only Element', () => {
  it('boots without a handoff when its container has no stamp', () => {
    document.body.innerHTML = '<div id="plain"></div>'
    const container = document.getElementById('plain') as HTMLElement
    const element = makeElement({
      Model: Schema.Struct({ label: Schema.String }),
      init: () => ({ model: { label: 'x' } }),
      update: (model: { readonly label: string }) => ({ model }),
      view: model => h.div([], [model.label]),
      container,
    })
    expect(element).toBeDefined()
    expect(document.body.hasAttribute('data-foldkit-refused')).toBe(false)
  })
})
