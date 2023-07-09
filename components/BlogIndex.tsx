import { getPagesUnderRoute } from "nextra/context"
import * as React from "react"
import Link from "next/link"

export declare namespace BlogIndex {
  export interface Props {
    readonly more?: string
    readonly pagesUnder: string
  }
}

export const BlogIndex: React.FC<BlogIndex.Props> = ({
  more = "Read more",
  pagesUnder,
}) => (
  <React.Fragment>
    {getPagesUnderRoute(pagesUnder)
      .filter((page) => page.kind === "MdxPage")
      .map((page) => {
        const meta = "meta" in page ? page.meta : undefined
        const frontMatter = "frontMatter" in page ? page.frontMatter : undefined
        return (
          <div key={page.route} className="mb-10">
            <h3>
              <Link
                href={page.route}
                style={{ color: "inherit", textDecoration: "none" }}
                className="block font-semibold mt-8 text-2xl "
              >
                {frontMatter?.series && (
                  <span className="align-middle text-xs nx-bg-primary-100 nx-font-semibold nx-text-primary-800 dark:nx-bg-primary-100/10 dark:nx-text-primary-600 inline-block py-1 px-2 uppercase rounded mb-1 mr-2">
                    Series{" "}
                  </span>
                )}
                <span>{meta?.title || frontMatter?.title || page.name}</span>
              </Link>
            </h3>
            <p className="opacity-80 mt-6 leading-7">
              {frontMatter?.description}{" "}
              <span className="inline-block">
                <Link
                  href={page.route}
                  className="text-[color:hsl(var(--nextra-primary-hue),100%,50%)] underline underline-offset-2 decoration-from-font"
                >
                  {more + " →"}
                </Link>
              </span>
            </p>
            {frontMatter?.date ? (
              <p className="opacity-50 text-sm mt-6 leading-7">
                {frontMatter.date}
              </p>
            ) : null}
          </div>
        )
      })}
  </React.Fragment>
)
