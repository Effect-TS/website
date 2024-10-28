"use client"

export const H2: React.FC<React.PropsWithChildren<{ id?: string }>> = ({
  id,
  children
}) => {
  return (
    <>
      <a className="block invisible relative -top-28" id={id} />
      <h2
        onClick={() => (window.location.hash = `#${id}`)}
        className="group cursor-pointer"
      >
        <span className="absolute -left-6 hidden font-normal text-zinc-400 lg:group-hover:inline">
          #
        </span>
        {children}
      </h2>
    </>
  )
}

export const H3: React.FC<React.PropsWithChildren<{ id?: string }>> = ({
  id,
  children
}) => {
  return (
    <>
      <a className="block invisible relative -top-28" id={id} />
      <h3
        onClick={() => (window.location.hash = `#${id}`)}
        className="group cursor-pointer"
      >
        <span className="absolute -left-6 hidden font-normal text-zinc-400 lg:group-hover:inline">
          #
        </span>
        {children}
      </h3>
    </>
  )
}

export const H4: React.FC<React.PropsWithChildren<{ id?: string }>> = ({
  id,
  children
}) => {
  return (
    <>
      <a className="block invisible relative -top-28" id={id} />
      <h4
        onClick={() => (window.location.hash = `#${id}`)}
        className="group cursor-pointer"
      >
        <span className="absolute -left-6 hidden font-normal text-zinc-400 lg:group-hover:inline">
          #
        </span>
        {children}
      </h4>
    </>
  )
}
