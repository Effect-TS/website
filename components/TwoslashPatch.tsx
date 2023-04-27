import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useCustomStyle } from "@/hooks/useCustomStyle"

export default function TwoslashPatchPortal() {
  const [isClientReady, setIsClientReady] = useState(false)

  useEffect(() => {
    setIsClientReady(true)
  }, [])

  const { currentStyle } = useCustomStyle()

  return (
    <>
      {isClientReady &&
        createPortal(<style>{currentStyle}</style>, document.body)}
    </>
  )
}
