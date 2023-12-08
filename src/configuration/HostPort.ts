import { Config } from "effect"

export class HostPort {
  constructor(readonly host: string, readonly port: number) {}

  get url() {
    return `${this.host}:${this.port}`
  }
}

// $ExpectType Config<[string, number]>
const both = Config.all([Config.string("HOST"), Config.number("PORT")])

// $ExpectType Config<HostPort>
export const config = Config.map(
  both,
  ([host, port]) => new HostPort(host, port)
)
