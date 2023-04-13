import { useEffect } from "react";
import { createPortal } from "react-dom";

const getCssOverrideElement = () => document.querySelector('.twoslash-override');

// const isMobile = globalThis.navigator.userAgentData.mobile
const isMobile = () => /iPhone|Android/i.test(globalThis.navigator.userAgent);

// (screenWidth: number): boolean => screenWidth < 500

function getSidePadding(mainElement: HTMLElement) {
  return Number(getComputedStyle(mainElement).paddingLeft.replace(/[^0-9]/g, "")) * 2;
}

function getPseudoElementWidth(currentElement: HTMLElement, pseudoName : string) {
    const computedStyle = getComputedStyle(currentElement, pseudoName);

    const customCssElement = document.createElement('div');
    customCssElement.style.position = 'absolute';
    customCssElement.style.visibility = 'hidden';
    customCssElement.style.pointerEvents = 'none';
    customCssElement.className = 'invisible-div';
    const stylesToCopy = [
      'content',
      'position',
      'transform',
      'display',
      'position',
      'width',
      'height',
      'border',
      'text-align',
      'padding',
      'border-radius',
      'font-family',
      'white-space',
      'margin',
    ];

    stylesToCopy.forEach(style => customCssElement.style[style as any] = computedStyle.getPropertyValue(style));

    customCssElement.textContent = customCssElement.style.content.replace(/['"]+/g, '');
    currentElement.appendChild(customCssElement);

    const rect = customCssElement.getBoundingClientRect();
    customCssElement.remove();
    return rect.width;
  }


  function getCurrentScroll(currentElement : HTMLElement) {
    const containerElement = currentElement.closest('.code-container')!
    return containerElement?.scrollLeft
  }

  function getOverridenCss({elementScrrenXPos, contentWidth, elementStaticXPos, allowedContentFullWidth}
                        : {elementScrrenXPos :number,  contentWidth:number, elementStaticXPos :number, allowedContentFullWidth :number}) {

    const screenWidth = globalThis.window.outerWidth;
    const elementScrrenXPosRatio = elementScrrenXPos / allowedContentFullWidth

    return elementStaticXPos + contentWidth > allowedContentFullWidth
           ?  (elementScrrenXPosRatio < 0.5
                ? `
                    pre.twoslash data-lsp:hover::before {
                        left: ${screenWidth/8}px !important;
                    }
                    `
                :
                `
                    pre.twoslash data-lsp:hover::before {
                        left: ${screenWidth/4}px !important;
                    }
                `)
          : ``
  }

  function overridePosition({twoslashOverrideElement, elementScrrenXPos,  contentWidth, elementStaticXPos, allowedContentFullWidth}
                          : {twoslashOverrideElement : Element ,  elementScrrenXPos : number,  contentWidth:number, elementStaticXPos :number, allowedContentFullWidth :number}) {
    twoslashOverrideElement.innerHTML = getOverridenCss({elementScrrenXPos, contentWidth, elementStaticXPos, allowedContentFullWidth})
  }


  function createNewStyleElement({elementScrrenXPos, contentWidth, elementStaticXPos, allowedContentFullWidth }
                                :{elementScrrenXPos : number, contentWidth:number, elementStaticXPos :number, allowedContentFullWidth :number}) {
        const newStyleElement = document.createElement('style');
        newStyleElement.classList.add('twoslash-override')
        newStyleElement.innerHTML = getOverridenCss({ elementScrrenXPos, contentWidth, elementStaticXPos, allowedContentFullWidth})
        document.head.appendChild(newStyleElement);
  }



function changeTwoSlashXPos( e: Event) {
  const screenWidth = globalThis.window.outerWidth;
  const mainElement = document.querySelector('main')!
  const padding = getSidePadding(mainElement)
  const allowedContentFullWidth = screenWidth - padding

  const currentElement = e.target as (HTMLElement | null)
  // if( currentElement == null || !isMobile(screenWidth)) return
  if( currentElement == null || !isMobile()) return

  const currentScroll = getCurrentScroll(currentElement)
  if(currentScroll == null) return

  const contentWidth = getPseudoElementWidth(currentElement, ':before');
  const elementScrrenXPos = currentElement.getBoundingClientRect().x
  const elementStaticXPos = currentElement.offsetLeft

  const cssOverrideElement = getCssOverrideElement()
  cssOverrideElement
  ? overridePosition({twoslashOverrideElement: cssOverrideElement  ,   elementScrrenXPos,  contentWidth, elementStaticXPos, allowedContentFullWidth})
  : createNewStyleElement({  elementScrrenXPos,  contentWidth, elementStaticXPos, allowedContentFullWidth})
}

export function useCustomStyle() {

  useEffect(() => {

      window.addEventListener("touch", (e) => {
          e.preventDefault()
          changeTwoSlashXPos(e as Event)
      })

      window.addEventListener("click", (e) => {
            e.preventDefault()
            changeTwoSlashXPos(e as Event)
      })
  }, []);
}

// export function TwoslashPatch() {
//   // const [...] = useState(...)

//   useEffect(() => {
//     // ... // same touch mechanism, but this time it manipulates the state
//   },[]) // most likely only state setters will be needed, which are anchored and don't require referencing in the deps array

//   return createPortal(<div />, document.body)
// }

