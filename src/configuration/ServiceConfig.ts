import * as HostPort from "./HostPort"
import { Config } from "effect"

class ServiceConfig {
  constructor(readonly hostPort: HostPort.HostPort, readonly timeout: number) {}
}

const config: Config.Config<ServiceConfig> = Config.map(
  Config.all([HostPort.config, Config.number("TIMEOUT")]),
  ([hostPort, timeout]) => new ServiceConfig(hostPort, timeout)
)
