"use client"

import { getNodeText } from "@/contentlayer/utils/sluggify"

export const H2: React.FC<React.PropsWithChildren<{ id?: string }>> = ({
  id,
  children
}) => {
  // const slug = slugs.slug(getNodeText(children))
  return (
    <h2
      id={id}
      onClick={() => (window.location.hash = `#${id}`)}
      className="group cursor-pointer"
    >
      <span className="absolute -left-6 hidden font-normal text-zinc-400 lg:group-hover:inline">
        #
      </span>
      {children}
    </h2>
  )
}

export const H3: React.FC<React.PropsWithChildren<{ id?: string }>> = ({
  id,
  children
}) => {
  // const slug = slugs.slug(getNodeText(children))
  return (
    <h3
      id={id}
      onClick={() => (window.location.hash = `#${id}`)}
      className="group cursor-pointer"
    >
      <span className="absolute -left-6 hidden font-normal text-zinc-400 lg:group-hover:inline">
        #
      </span>
      {children}
    </h3>
  )
}

export const H4: React.FC<React.PropsWithChildren<{ id?: string }>> = ({
  id,
  children
}) => {
  // const slug = slugs.slug(getNodeText(children))
  return (
    <h4
      id={id}
      onClick={() => (window.location.hash = `#${id}`)}
      className="group cursor-pointer"
    >
      <span className="absolute -left-6 hidden font-normal text-zinc-400 lg:group-hover:inline">
        #
      </span>
      {children}
    </h4>
  )
}
