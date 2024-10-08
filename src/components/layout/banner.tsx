import { Fragment } from "react"
import { cn } from "@/lib/utils"
import { Icon } from "../icons"

export function EffectDaysBanner() {
  const key = "effect-days-2025-banner"
  const hideBannerScript = `try{if(localStorage.getItem(${JSON.stringify(
    key
  )})==="0"){document.body.classList.add("hide-effect-days-banner")}}catch(e){}`

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    try {
      window.localStorage.setItem(key, "0")
    } catch {
      /* ignore */
    }
    document.body.classList.add("hide-effect-days-banner")
  }

  return (
    <Fragment>
      <script dangerouslySetInnerHTML={{ __html: hideBannerScript }} />
      <a
        href="/events/effect-days"
        target="_blank"
        className={cn(
          "sticky block h-12 bg-[#5d2ace] hover:bg-[#471da5] font-display text-white text-sm lg:text-base tracking-wider transition-colors",
          "[body.hide-effect-days-banner_&]:hidden"
        )}
      >
        <div className="h-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 flex justify-between items-center">
          <div>Effect Days: March 19-21, 2025 | Tuscany, Italy</div>
          <div className="flex justify-center items-center gap-4 md:gap-6">
            <span>Get tickets ↗</span>
            <button type="button" aria-label="Close banner" className="pt-0.5" onClick={handleClick}>
              <Icon name="close" className="h-4 w-4 font-bold" />
            </button>
          </div>
        </div>
      </a>
    </Fragment>
  )
}
