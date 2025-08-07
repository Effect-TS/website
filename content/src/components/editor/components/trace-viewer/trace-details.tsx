import { useMemo, Fragment } from "react"
import * as Duration from "effect/Duration"
import * as Option from "effect/Option"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Event, Span } from "../../domain/devtools"
import { formatDuration } from "./utils"
import { useAtomValue } from "@effect-atom/atom-react"
import { selectedSpanAtom } from "../../atoms/devtools"

export function TraceDetails({ span }: { readonly span: Span }) {
  return (
    <div className="flex flex-col mb-1 p-2 bg-[--sl-color-bg] border border-black/40 rounded-sm">
      <div className="flex justify-between mb-2 px-2 pb-1 border-b border-muted-foreground">
        <h3 className="font-display text-lg">{span.label}</h3>
        {Option.isSome(span.duration) && (
          <div>
            <span className="mr-1">Duration:</span>
            <span className="text-[--sl-color-text]">{formatDuration(span.duration.value)}</span>
          </div>
        )}
      </div>
      <Accordion type="multiple">
        <TraceAttributes attributes={Array.from(span.attributes)} />
        <TraceEvents events={span.events} />
      </Accordion>
    </div>
  )
}

function TraceAttributes({ attributes }: { readonly attributes: ReadonlyArray<[string, unknown]> }) {
  return attributes.length === 0 ? (
    <div className="mb-2 pl-3 space-x-1">
      <span>Attributes</span>
      <span className="text-xs text-[--sl-color-text]">( {attributes.length} )</span>
    </div>
  ) : (
    <AccordionItem value="attributes" className="mb-2 border-b-0">
      <AccordionTrigger
        icon="left"
        className="py-0 pl-2 justify-start bg-transparent data-[state=open]:mb-1 cursor-pointer !no-underline"
      >
        <div className="ml-1 space-x-1">
          <span>Attributes</span>
          <span className="text-xs text-[--sl-color-text]">( {attributes.length} )</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-0">
        <Table className="border-spacing-0">
          <TableHeader className="hidden">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-full">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&>tr>td]:py-1">
            {Array.from(attributes).map(([key, value]) => (
              <TableRow
                key={key}
                className="even:bg-[--sl-color-bg-nav] odd:bg-[--sl-color-gray-6] dark:odd:bg-[--sl-color-gray-5] pointer-events-none"
              >
                <TableCell className="font-medium">{key}</TableCell>
                <TableCell className="w-full text-[--sl-color-white]">{JSON.stringify(value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AccordionContent>
    </AccordionItem>
  )
}

function TraceEvents({ events }: { readonly events: ReadonlyArray<Event> }) {
  return events.length === 0 ? (
    <div className="py-1 pl-3 bg-[--sl-color-bg-nav] space-x-1 font-display">
      <span>Events</span>
      <span className="text-xs text-[--sl-color-text]">( {events.length} )</span>
    </div>
  ) : (
    <AccordionItem value="events" className="border-b-0">
      <AccordionTrigger
        icon="left"
        className="py-1 pl-2 justify-start bg-[--sl-color-bg-nav] cursor-pointer !no-underline"
      >
        <div className="ml-1 space-x-1 font-display">
          <span>Events</span>
          <span className="text-xs text-[--sl-color-text]">( {events.length} )</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="py-2">
        <div className="ml-2">
          <Accordion type="multiple" className="w-fit">
            {events.map((node, index) => (
              <AccordionItem key={index} value={`${index}`}>
                <TraceEvent node={node} />
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <div className="mt-2 ml-2 text-xs text-[--sl-color-text]">
          <span>Log timestamps are relative to the start time of the full trace.</span>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

function TraceEvent({ node }: { readonly node: Event }) {
  const selectedSpan = useAtomValue(selectedSpanAtom)
  const eventTimestamp = useMemo(() => {
    if (selectedSpan !== undefined) {
      // Since external spans will not have events, it is safe to `.getOrThrow`
      // the `startTime` of the selected span
      const traceStartTime = Option.getOrThrow(selectedSpan.startTime)
      const eventStartTime = Duration.nanos(node.event.startTime)
      const relativeTimestamp = Duration.subtract(eventStartTime, traceStartTime)
      return formatDuration(relativeTimestamp)
    }
    return ""
  }, [node.event.startTime, selectedSpan])
  return (
    <Fragment>
      <AccordionTrigger
        icon="left"
        className="group bg-[--sl-color-bg] p-0 justify-start data-[state=open]:mb-1 cursor-pointer !no-underline"
      >
        <div className="max-w-32 ml-1 truncate">
          <span>{eventTimestamp}</span>
          <span className="ml-2 text-xs font-light group-data-[state=open]:hidden">{node.event.name}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-0">
        <Table className="border-spacing-0">
          <TableHeader className="hidden">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-full">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&>tr>td]:py-1">
            <TableRow className="even:bg-[--sl-color-bg-nav] odd:bg-[--sl-color-gray-6] dark:odd:bg-[--sl-color-gray-5] pointer-events-none">
              <TableCell className="font-medium">message</TableCell>
              <TableCell>{JSON.stringify(node.event.name)}</TableCell>
            </TableRow>
            {Object.entries(node.event.attributes).map(([key, value]) => (
              <TableRow
                key={key}
                className="even:bg-[--sl-color-bg-nav] odd:bg-[--sl-color-gray-6] dark:odd:bg-[--sl-color-gray-5] pointer-events-none"
              >
                <TableCell className="font-medium">{key}</TableCell>
                <TableCell className="w-full">{JSON.stringify(value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AccordionContent>
    </Fragment>
  )
}
