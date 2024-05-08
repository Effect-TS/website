"use server"

export async function Navigation({
  slug
}: {
  readonly slug: ReadonlyArray<string>
}) {
  return (
    <div className="p-2">
      <nav className="shadow-md bg-white p-2 rounded">Navigation</nav>
    </div>
  )
}
