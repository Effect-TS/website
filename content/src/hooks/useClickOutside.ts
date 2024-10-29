import { useEffect, type RefObject } from "react"

export function useClickOutside(
  ref: RefObject<HTMLElement>,
  onClickOutside: (event: MouseEvent) => void
) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as any)) {
        onClickOutside(event)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [ref, onClickOutside])
}
