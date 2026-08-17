import { icons } from "@iconify-json/fa7-brands"
import { getIconData, iconToSVG } from "@iconify/utils"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

export const Icon = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^fa7-brands:[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  Schema.brand("IconId"),
)
export type Icon = typeof Icon.Type

export class InvalidIconId extends Schema.TaggedError<InvalidIconId>()(
  "InvalidIconId",
  {
    input: Schema.String,
    cause: Schema.Defect(),
  },
) {}

export class IconNotFound extends Schema.TaggedError<IconNotFound>()(
  "IconNotFound",
  { id: Icon },
) {}

export const name = (icon: Icon): string => icon.slice("fa7-brands:".length)

export const render = Effect.fn("Icon.render")(function* (icon: Icon) {
  const data = getIconData(icons, name(icon))

  if (data === null) {
    return yield* new IconNotFound({ id: icon })
  }

  const { attributes, body } = iconToSVG(data)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${attributes.viewBox}" fill="currentColor">${body}</svg>\n`
})
