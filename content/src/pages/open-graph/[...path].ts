import { getCollection } from "astro:content"
import { OGImageRoute } from "astro-og-canvas"

const entries = await getCollection("docs")

const pages = Object.fromEntries(entries.map(({ data, id }) => [id, { data }]))

export type Page = (typeof pages)[number]

export const { getStaticPaths, GET } = OGImageRoute({
  pages,
  param: "path",
  getImageOptions: (_path, page: Page) => {
    return {
      title: page.data.title,
      description: page.data.description || "",
      bgImage: {
        path: "./src/pages/open-graph/_assets/background.png"
      },
      font: {
        title: {
          size: 64,
          lineHeight: 1.2,
          families: ["CalSans"],
          color: [255, 255, 255],
        },
        description: {
          size: 32,
          lineHeight: 1.2,
          families: ["Inter"],
          weight: "Normal",
          color: [161, 161, 171],
        },
      },
      fonts: [
        "./src/pages/open-graph/_assets/inter-light.ttf",
        "./src/pages/open-graph/_assets/cal-sans-semibold.ttf"],
      logo: {
        path: "./src/pages/open-graph/_assets/logo.png"
      }
    }
  },
})
