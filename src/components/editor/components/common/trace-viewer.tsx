"use client"

import { useRxValue } from "@effect-rx/rx-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { Icon } from "@/components/icons"
import { spanProviderRx } from "@/workspaces/rx"
import { TraceSelector } from "./trace-viewer/trace-selector"
import { DataTable } from "./trace-viewer/data-table"
import { columns } from "./trace-viewer/columns"

export function TraceViewer() {
  const spans = useRxValue(spanProviderRx)
  console.log({ spans })
  return (
    <div className="p-2">
      <div className="flex justify-between items-center">
        <div className="min-w-1/2 flex items-center shrink">
          <h1 className="mr-3 text-3xl font-display">Trace</h1>
          <div>
            <TraceSelector
              traceIds={spans.map(({ span }) => span.traceId)}
              onSelect={console.log}
            />
          </div>
        </div>
      </div>
      <div className="mb-6 has-[div[data-state=open]]:mb-0 has-[div[data-state=closed]]:border-b has-[div[data-state=closed]]:dark:border-neutral-700">
        <Accordion type="single" collapsible>
          <AccordionItem value="trace-summary">
            <AccordionTrigger
              icon="left"
              className="p-0 justify-start text-base !no-underline"
              transitionIcon={false}
            >
              <p className="ml-2 py-3">
                <span className="flex items-center text-sm text-zinc-700 dark:text-zinc-400">
                  <span className="mr-2 font-bold text-black dark:text-white">
                    Trace Summary
                  </span>
                  <span className="mr-4">
                    <Icon name="question-circle" />
                  </span>
                  <span>
                    3 spans at Jun 21 2024 06:29:13 UTC-04:00 (159.5ms)
                  </span>
                </span>
              </p>
            </AccordionTrigger>
            <AccordionContent disableAnimations>
              <div className="-mt-1 mb-2 pb-3 border-b dark:border-neutral-700">
                Content
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <div className="grow">
        <DataTable
          columns={columns}
          data={spans.map((span) => ({
            traceId: span.span.traceId,
            spanId: span.span.spanId
          }))}
        />
      </div>
    </div>
  )
}
