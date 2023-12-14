import Link from "next/link"
import { FC, Fragment } from "react"
import { Icon } from "../icons"

export const Breadcrumbs: FC<{ elements: Breadcrumbs }> = ({ elements }) => {
  return (
    <ul className="flex text-sm gap-2 items-center h-4 -mt-5 mb-1">
      {elements.map(({ name, href }, index) => (
        <Fragment key={index}>
          <li>
            <Link href={href} className="hover:text-black dark:hover:text-white">
              {name}
            </Link>
          </li>
          <Icon name={"chevron-right"} className="h-2.5 text-zinc-400 dark:text-zinc-600" />
        </Fragment>
      ))}
    </ul>
  )
}
