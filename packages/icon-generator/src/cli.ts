#!/usr/bin/env node

import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as CliConfig from "effect/unstable/cli/CliConfig"
import * as Argument from "effect/unstable/cli/Argument"
import * as Command from "effect/unstable/cli/Command"
import * as Flag from "effect/unstable/cli/Flag"
import { Help } from "effect/unstable/cli/GlobalFlag"
import * as IconGenerator from "./IconGenerator.ts"

const icons = Argument.string("icon").pipe(
  Argument.variadic({ min: 1 }),
  Argument.withDescription("Icon IDs such as fa7-brands:github"),
)

const output = Flag.directory("output").pipe(
  Flag.withDefault("."),
  Flag.withDescription("Directory that receives generated icon collections"),
)

const generateCommand = Command.make("generate", { icons, output }).pipe(
  Command.withDescription("Generate static SVG files from Iconify collections"),
  Command.withHandler(({ icons, output }) =>
    IconGenerator.generate(icons, output),
  ),
)

export const command = Command.make("icon-generator").pipe(
  Command.withDescription("Generate Worker-safe static icon assets"),
  Command.withSubcommands([generateCommand]),
)

const program = Command.run(command, { version: "0.0.0" })

const MainLayer = Layer.mergeAll(
  CliConfig.layer({ builtIns: [Help] }),
  NodeServices.layer,
)

program.pipe(Effect.provide(MainLayer), NodeRuntime.runMain)
