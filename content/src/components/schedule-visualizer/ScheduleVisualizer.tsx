import React from "react"

import "./ScheduleVisualizer.css"
import { Duration } from "effect"

export type ScheduleVisualizerProps = {
  code: string
  items: ReadonlyArray<ScheduleItem>
}

type ScheduleItem = {
  value: string
  interval: Duration.Duration
  clock: Duration.Duration
  hasNewValue: boolean
}

export const ScheduleVisualizer: React.FC<ScheduleVisualizerProps> = ({
  code,
  items
}) => {
  return (
    <div className="not-content">
      <pre className="font-mono">{code}</pre>
      <div className="relative">
        <div className="w-full absolute inset-0 top-[70px] z-10">
          <div className="arrow w-full" />
          <div className="absolute -bottom-4 right-0 text-sm">time</div>
          <div className="absolute -top-[54px] right-0 text-sm">
            output
          </div>
        </div>
        <div className="flex space-x-0.5 z-20 relative p-4">
          {items.map((item, index) => (
            <ScheduleItem key={index} {...item} />
          ))}
        </div>
      </div>
    </div>
  )
}

const ScheduleItem: React.FC<ScheduleItem> = ({
  value,
  interval,
  clock,
  hasNewValue
}) => {
  return (
    <div className="h-[80px] flex flex-col space-y-2">
      <div className="-ml-[4px] text-sm pb-2">{value}</div>
      <div
        className={`w-3 h-3 rounded-full bg-red-500 flex-shrink-0 -ml-[5px] ${
          hasNewValue ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="flex space-x-0.5 items-center">
        <div className="w-px h-4 bg-white" />
        <div
          style={{
            width: `${durationToPixels(interval)}px`,
            background: "#DAF0FF",
            border: "1px solid #0095FF",
            color: "#007BD3"
          }}
          className="font-bold text-center p-0.5 text-xs"
        >
          {Duration.format(interval)}
        </div>
      </div>
      <div className="-ml-[4px] text-sm">
        {Duration.toMillis(clock) === 0 ? "0s" : Duration.format(clock)}
      </div>
    </div>
  )
}

const durationToPixels = (duration: Duration.Duration) => {
  return Math.round(Duration.toSeconds(duration) * 60)
}
