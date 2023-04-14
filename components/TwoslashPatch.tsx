import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {useCustomStyle} from '@/hooks/useCustomStyle'

export default function TwoslashPatchPortal() {

    const {
        isMounted,
        currentStyle
    } = useCustomStyle()

    return  <>
        {isMounted &&
        createPortal(
            <style>
                {currentStyle}
            </style>
        , document.body)}
    </>
}
