import { GlowingIcon } from "../atoms/glowing-icon"

export const Catch = () => {
  return (
    <section className="relative">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-32">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white text-center mb-16">
          Okay, so what&apos;s the catch?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          <div>
            <div className="flex items-center gap-3">
              <GlowingIcon name="trend-up" />
              <h3 className="font-display text-xl text-white">
                Learning curve
              </h3>
            </div>
            <p className="my-6">
              Learning Effect can be quite daunting but it doesn’t take long
              for you to be productive. It’s similar to learning TypeScript.
              It’s worth it.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <GlowingIcon name="lightbulb" />
              <h3 className="font-display text-xl text-white">
                Different programming style
              </h3>
            </div>
            <p className="my-6">
              To ensure a high level of type-safety, composabilty and
              tree-shakability, Effect&apos;s programming style might be
              different from what you&apos;re used to.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <GlowingIcon name="blocks" />
              <h3 className="font-display text-xl text-white">
                Extensive API surface
              </h3>
            </div>
            <p className="my-6">
              Effect has an API for every situation. While it may take some
              time to learn them all, a handful of the most common ones will
              get you a long way.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
