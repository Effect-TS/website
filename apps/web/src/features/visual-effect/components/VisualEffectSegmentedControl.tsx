import { useAtomValue } from "@effect/atom-react"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import type { ControlRenderProps } from "../model/example-definition"
import { useControlWrite } from "./VisualEffectProvider"

export function VisualEffectSegmentedControl<A extends string>({
  control,
  options,
}: ControlRenderProps<A> & {
  readonly options: ReadonlyArray<A>
}) {
  const value = useAtomValue(control.atom)
  const setValue = useControlWrite(control)

  return (
    <div className="flex flex-wrap items-center justify-start gap-3">
      <span className="font-mono text-sm tracking-wider text-neutral-500 uppercase select-none">
        {control.label}
      </span>
      <SegmentedControl value={value} onChange={setValue} options={options} />
    </div>
  )
}
