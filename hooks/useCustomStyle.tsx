import { useEffect, useState } from "react"

function getOneSidePadding(mainElement: HTMLElement) {
  return Number(getComputedStyle(mainElement).paddingLeft.replace("px", ""))
}

function getPseudoElementWidth(
  currentElement: HTMLElement,
  pseudoName: string
) {
  return Number(
    getComputedStyle(currentElement, pseudoName).width.replace("px", "")
  )
}

function isInCodeContainer(currentElement: HTMLElement) {
  const containerElement = currentElement.closest(".code-container")!
  return containerElement?.scrollLeft
}

function getValuesForCSSLeft(currentElement: HTMLElement) {
  const screenWidth = window.innerWidth
  const mainElement = document.querySelector("main")!
  const mainLeftPadding = getOneSidePadding(mainElement)
  const allowedContentFullWidth = screenWidth - mainLeftPadding * 2

  const elementXPos = currentElement.getBoundingClientRect().x - mainLeftPadding
  const elementXPosRatio = elementXPos / allowedContentFullWidth

  return {
    elementXPos,
    allowedContentFullWidth,
    elementXPosRatio,
  }
}

function computeTwoSlashOverrideStyle({
  contentWidth,
  allowedContentFullWidth,
  elementXPos,
}: {
  contentWidth: number
  allowedContentFullWidth: number
  elementXPos: number
}) {
  return contentWidth >= allowedContentFullWidth
    ? `pre.twoslash data-lsp:hover::before {
    left: 0px !important;
    }`
    : elementXPos + contentWidth >= allowedContentFullWidth
    ? `pre.twoslash data-lsp:hover::before {
    left: ${allowedContentFullWidth - contentWidth}px !important;
    }`
    : `pre.twoslash data-lsp:hover::before {
    left: ${elementXPos}px !important;
    }`
}

export function useCustomStyle() {
  const [currentStyle, setCurrentStyle] = useState("")

  const rePositionTwoSlashBox = (e: Event) => {
    const isMobile = globalThis.matchMedia("(max-width: 767px)").matches
    const currentElement = e.target as HTMLElement | null
    if (currentElement == null || !isMobile) return
    if (isInCodeContainer(currentElement) == null) return

    const { elementXPos, allowedContentFullWidth } =
      getValuesForCSSLeft(currentElement)

    const contentWidth = getPseudoElementWidth(currentElement, ":before")

    setCurrentStyle(
      computeTwoSlashOverrideStyle({
        contentWidth,
        allowedContentFullWidth,
        elementXPos,
      })
    )
  }

  useEffect(() => {
    const touchAndClickListener = (e: Event) => {
      e.preventDefault()
      rePositionTwoSlashBox(e)
    }

    window.addEventListener("touch", touchAndClickListener)
    window.addEventListener("click", touchAndClickListener)

    return () => {
      window.removeEventListener("touch", touchAndClickListener)
      window.removeEventListener("click", touchAndClickListener)
    }
  }, [])

  return {
    currentStyle,
  }
}
