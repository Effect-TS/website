import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function isMobile() {
  const userAgent = navigator.userAgent || navigator.vendor ;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

// const isMobile = () => /iPhone|Android/i.test(globalThis.navigator.userAgent);

function getPadding(mainElement: HTMLElement) {
  return Number(getComputedStyle(mainElement).paddingLeft.replace(/[^0-9]/g, "")) ;
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

function changeTwoSlashXPos( currentElement : HTMLElement , currentScroll : number) {

    const screenWidth = globalThis.window.outerWidth;
    const mainElement = document.querySelector('main')!
    const padding = getPadding(mainElement)
    const allowedContentFullWidth = screenWidth - padding

    const contentWidth = getPseudoElementWidth(currentElement, ':before');
    const elementScrrenXPos = currentElement.getBoundingClientRect().x
    const elementStaticXPos = currentElement.offsetLeft
    const elementScrrenXPosRatio = elementScrrenXPos / allowedContentFullWidth

    return {
        elementStaticXPos, 
        elementScrrenXPos,
        contentWidth, 
        allowedContentFullWidth, 
        elementScrrenXPosRatio,
        padding
    }
}

export function useCustomStyle() {

  const [isMounted, setIsMounted] = useState(false);
  const [elementStaticXPos, setElementStaticXPos]             = useState<number>();
  const [allowedContentFullWidth, setAllowedContentFullWidth] = useState<number>();   
  const [elementScrrenXPosRatio, setElementScrrenXPosRatio] =   useState<number>();     
  const [contentWidth, setContentWidth] =                       useState<number>(); 
  const [elementScrrenXPos, setElementScrrenXPos] =             useState<number>();   
  const [padding, setPadding] =                                 useState<number>();   
  const screenWidth = globalThis?.window?.outerWidth;
  
  function rePositionTwoSlashBox(e:Event) {
              
      const currentElement = e.target as (HTMLElement | null)
      if( currentElement == null || !isMobile()) {
          console.log('it is not mobile');                    
          return
      }
      const currentScroll = getCurrentScroll(currentElement)
      if(currentScroll == null) return


      const { elementStaticXPos, 
              elementScrrenXPos,
              contentWidth, 
              allowedContentFullWidth, 
              elementScrrenXPosRatio,
              padding} =  changeTwoSlashXPos(currentElement, currentScroll)

              setElementScrrenXPos(elementScrrenXPos)
              setElementStaticXPos(elementStaticXPos)
              setAllowedContentFullWidth(allowedContentFullWidth)
              setElementScrrenXPosRatio(elementScrrenXPosRatio)
              setContentWidth(contentWidth)
              setPadding(padding)
  }

  useEffect(() => {
      setIsMounted(true);
      return () => setIsMounted(false);
  },[]) 

  const touchAndClickListener = (e : Event) => {
      e.preventDefault()
      console.log('touched');                
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
    isMounted ,
    elementStaticXPos ,
    elementScrrenXPos,
    contentWidth ,
    padding,
    allowedContentFullWidth ,
    elementScrrenXPosRatio  ,
  }
}