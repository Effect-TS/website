import { Fragment } from "react"

export function EffectDaysBanner() {
  return (
    <Fragment>
      <a
        href="/events/effect-days"
        target="_blank"
        className="sticky block h-12 bg-[#5d2ace] hover:bg-[#471da5] font-display text-white text-sm lg:text-base tracking-wider transition-colors"
      >
        <div className="h-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 flex justify-between items-center">
          <span>Effect Days: March 19-21, 2025 | Tuscany, Italy</span>
          <span>Get tickets ↗</span>
        </div>
      </a>
    </Fragment>
  )
}
