import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {useCustomStyle} from '@/hooks/useCustomStyle'

export default function TwoslashPatchPortal() {

    const {
        isMounted,
        elementStaticXPos, 
        elementScrrenXPos,
        contentWidth, 
        allowedContentFullWidth, 
        elementScrrenXPosRatio,
        padding
    } = useCustomStyle() 
    
    return  <>
        {isMounted &&
        elementStaticXPos && 
        contentWidth && 
        allowedContentFullWidth &&
        elementScrrenXPosRatio && 
        createPortal(
            <style>
                {elementScrrenXPos && padding &&
                (elementScrrenXPos + contentWidth > allowedContentFullWidth
                ? `pre.twoslash data-lsp:hover::before {
                    left: ${allowedContentFullWidth - contentWidth - (padding * 2) }px !important;
                }`
                : `
                pre.twoslash data-lsp:hover::before {
                    left: ${elementScrrenXPos}px !important;
                `)
                }
            </style>
        , document.body)}        
    </>  
}