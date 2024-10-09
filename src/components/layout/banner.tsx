import { Fragment } from "react"

export function EffectDaysBanner() {
  return (
    <Fragment>
      <a
        href="/events/effect-days"
        target="_blank"
        className="sticky block h-12 bg-[#5e24dd] hover:bg-[#4c19bf] font-sans text-white text-sm lg:text-base transition-colors"
      >
        <div className="h-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 flex justify-between items-center">
          <span className="font-normal">Effect Days: March 19-21, 2025 | Tuscany, Italy</span>
          <span className="font-semibold">Get tickets ↗</span>
        </div>
      </a>
    </Fragment>
  )
}
