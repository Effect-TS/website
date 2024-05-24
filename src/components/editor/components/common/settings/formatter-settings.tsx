"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { effectTsResolver } from "@hookform/resolvers/effect-ts"
import { SubmitHandler, useForm } from "react-hook-form"

import {
  Settings,
  type EncodedSettings
} from "@/components/editor/services/Monaco/formatters/typescript"

export declare namespace FormatterSettings {
  export interface Props {
    readonly open: boolean
    readonly onOpenChange: OnOpenChange
  }

  export interface OnOpenChange {
    (open: boolean): void
  }
}

export const FormatterSettings: React.FC<FormatterSettings.Props> = ({
  open,
  onOpenChange
}) => {
  const form = useForm<EncodedSettings>({
    resolver: effectTsResolver(Settings as any),
    defaultValues: {
      indentWidth: "2",
      lineWidth: "120",
      operatorPosition: "maintain",
      quoteStyle: "alwaysDouble",
      semiColons: "asi",
      trailingCommas: "never"
    }
  })

  const handleSubmit: SubmitHandler<any> = (values: Settings) => {
    console.log(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <Form {...form}>
          <form
            className="space-y-8"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <DialogHeader>
              <DialogTitle>Formatter Settings</DialogTitle>
              <DialogDescription>
                You can modify the settings for the TypeScript code formatter
                below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <FormField
                name="lineWidth"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 grid-rows-2 items-center gap-x-4">
                    <FormLabel className="text-right">Line Width</FormLabel>
                    <FormControl>
                      <Input className="col-span-3" {...field} />
                    </FormControl>
                    <FormDescription className="col-start-2 col-span-3">
                      The width of a line the printer will try to stay under.
                      Note that the printer may exceed this width in certain
                      cases.
                    </FormDescription>
                    <FormMessage className="col-start-2 col-span-3" />
                  </FormItem>
                )}
              />
              <FormField
                name="indentWidth"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 grid-rows-2 items-center gap-x-4">
                    <FormLabel className="text-right">Indent Width</FormLabel>
                    <FormControl>
                      <Input className="col-span-3" {...field} />
                    </FormControl>
                    <FormDescription className="col-start-2 col-span-3">
                      The number of columns for an indent.
                    </FormDescription>
                    <FormMessage className="col-start-2 col-span-3" />
                  </FormItem>
                )}
              />
              <FormField
                name="operatorPosition"
                control={form.control}
                render={({ field }) => (
                  <SettingsSelector
                    title="Operator Position"
                    description="Where to place the operator for expressions that span multiple lines."
                    value={field.value}
                    onChange={field.onChange}
                    choices={[
                      { label: "Maintain", value: "maintain" },
                      { label: "Next Line", value: "nextLine" },
                      { label: "Same Line", value: "sameLine" }
                    ]}
                  />
                )}
              />
              <FormField
                name="quoteStyle"
                control={form.control}
                render={({ field }) => (
                  <SettingsSelector
                    title="Quote Style"
                    description="How to use single or double quotes."
                    value={field.value}
                    onChange={field.onChange}
                    choices={[
                      { label: "Always Double", value: "alwaysDouble" },
                      { label: "Always Single", value: "alwaysSingle" },
                      { label: "Prefer Double", value: "preferDouble" },
                      { label: "Prefer Single", value: "preferSingle" }
                    ]}
                  />
                )}
              />
              <FormField
                name="semiColons"
                control={form.control}
                render={({ field }) => (
                  <SettingsSelector
                    title="Semicolons"
                    description="How semi-colons should be used."
                    value={field.value}
                    onChange={field.onChange}
                    choices={[
                      { label: "Always", value: "always" },
                      { label: "Automatic", value: "asi" },
                      { label: "Prefer", value: "prefer" }
                    ]}
                  />
                )}
              />
              <FormField
                name="trailingCommas"
                control={form.control}
                render={({ field }) => (
                  <SettingsSelector
                    title="Trailing Commas"
                    description="If trailing commas should be used."
                    value={field.value}
                    onChange={field.onChange}
                    choices={[
                      { label: "Always", value: "always" },
                      { label: "Never", value: "never" },
                      { label: "Only MultiLine", value: "onlyMultiLine" }
                    ]}
                  />
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" variant="outline">
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

FormatterSettings.displayName = "FormatterSettings"

function SettingsSelector({
  title,
  description,
  value,
  choices,
  onChange
}: {
  title: string
  description: string
  value: string
  choices: ReadonlyArray<{ label: string; value: string }>
  onChange: (...event: any[]) => void
}) {
  return (
    <FormItem className="grid grid-cols-4 grid-rows-2 items-center gap-x-4">
      <FormLabel className="text-right">{title}</FormLabel>
      <Select defaultValue={value} onValueChange={onChange}>
        <FormControl>
          <SelectTrigger className="col-start-2 col-span-3">
            <SelectValue placeholder="Select a value" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {choices.map(({ label, value }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormDescription className="col-start-2 col-span-3">
        {description}
      </FormDescription>
      <FormMessage className="col-start-2 col-span-3" />
    </FormItem>
  )
}
