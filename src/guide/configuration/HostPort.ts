import { Config } from "effect"

export class HostPort {
  constructor(readonly host: string, readonly port: number) {}

  get url() {
    return `${this.host}:${this.port}`
  }
}

// $ExpectType Config<HostPort>
export const config = Config.all([
  Config.string("HOST"),
  Config.number("PORT"),
]).pipe(Config.map(([host, port]) => new HostPort(host, port)))
