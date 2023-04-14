import { useEffect, useState } from "react";

function isMobile() {
    return globalThis.matchMedia("(max-width: 767px)").matches
}

function getOneSidePadding(mainElement: HTMLElement) {

    return Number(getComputedStyle(mainElement).paddingLeft.replace("px", "")) ;
}

function getPseudoElementWidth(currentElement: HTMLElement, pseudoName : string) {

    return Number(getComputedStyle(currentElement, pseudoName).width.replace('px', ''))
}

function isInCodeContainer(currentElement : HTMLElement) {
    const containerElement = currentElement.closest('.code-container')!
    return containerElement?.scrollLeft
}

function getValuesForCSSLeft( currentElement : HTMLElement) {

    const screenWidth = globalThis.window.outerWidth;
    const mainElement = document.querySelector('main')!
    const mainLeftPadding = getOneSidePadding(mainElement)

    const allowedContentFullWidth = screenWidth - (mainLeftPadding * 2)

    const elementXPos = currentElement.getBoundingClientRect().x - mainLeftPadding
    const elementXPosRatio = elementXPos / allowedContentFullWidth

    return {
        elementXPos,
        allowedContentFullWidth,
        elementXPosRatio,
    }
}

function computeTwoSlashOverrideStyle({isMounted,
                                        contentWidth,
                                        allowedContentFullWidth,
                                        elementXPos,
                                      } :
                                      {isMounted: boolean,
                                      contentWidth: number ,
                                      allowedContentFullWidth: number ,
                                      elementXPos: number ,
                                      }) {

    return  isMounted
            ?(
                contentWidth >= allowedContentFullWidth
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
            )
            : "";
}

export function useCustomStyle() {

  const [isMounted, setIsMounted] = useState(false);
  const [currentStyle, setCurrentStyle] = useState("");

  function rePositionTwoSlashBox(e:Event) {

    const currentElement = e.target as (HTMLElement | null)
    if( currentElement == null || !isMobile()) return
    if(isInCodeContainer(currentElement) == null) return

    const {
            elementXPos,
            allowedContentFullWidth,
        } =  getValuesForCSSLeft(currentElement)

    const contentWidth = getPseudoElementWidth(currentElement, ':before');

    setCurrentStyle(
        computeTwoSlashOverrideStyle({
            isMounted,
            contentWidth,
            allowedContentFullWidth,
            elementXPos,
        })
    )
  }

  useEffect(() => {
      setIsMounted(true);
      return () => setIsMounted(false);
  },[])

  const touchAndClickListener = (e : Event) => {
      e.preventDefault()
      rePositionTwoSlashBox(e)
  }

  useEffect(() => {
      if(isMounted ) {
          window.addEventListener("touch", touchAndClickListener)
          window.addEventListener("click", touchAndClickListener)
      }

      return () => {
          window.removeEventListener("touch", touchAndClickListener)
          window.removeEventListener("click", touchAndClickListener)
      }
  }, [isMounted]);

  return {
    currentStyle,
    isMounted ,
  }
}
