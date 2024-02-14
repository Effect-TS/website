import { Search } from "@/components/atoms/search"
import { Navigation } from "@/components/layout/navigation"

export default function NotFound() {
  return (
    <>
      <Navigation />
      <main className="w-full overflow-x-hidden min-h-screen relative pt-16 sm:pt-24 flex justify-center">
        <div className="mt-16 sm:mt-28 lg:mt-40 text-center flex flex-col items-center gap-8">
          <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl text-transparent bg-clip-text bg-gradient-to-br from-red-400 to-red-600">
            404
          </h1>
          <p>This page could not be found.</p>
          <Search />
        </div>
      </main>
    </>
  )
}
