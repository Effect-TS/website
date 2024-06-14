"use server"

import { Navigation } from "@/components/layout/navigation"
import { TutorialsDisplay } from "./components/TutorialsDisplay"

export default async function TutorialsPage() {
  return (
    <>
      <Navigation />
      <main className="docs-container relative w-full max-w-screen-2xl min-h-screen mx-auto px-4 sm:px-8 lg:px-16 pt-24 sm:pt-40">
        <section>
          <div className="container px-4 md:px-6">
            <div className="max-w-2xl mx-auto text-center space-y-4 text-white">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                Explore Our Tutorials
              </h1>
              <p className="text-gray-200 text-lg md:text-xl">
                Find the perfect learning path to level-up your understanding
                of Effect! Browse our curated selection of educational
                materials.
              </p>
            </div>
          </div>
        </section>
        <TutorialsDisplay />
      </main>
    </>
  )
}
