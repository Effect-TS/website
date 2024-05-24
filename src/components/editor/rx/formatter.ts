import { Rx } from "@effect-rx/rx-react";
import { Layer } from "effect";

const runtime = Rx.runtime(Layer.mergeAll())