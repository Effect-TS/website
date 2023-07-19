import * as HostPort from "./HostPort"
import { Config } from "effect"

class ServiceConfig {
  constructor(readonly hostPort: HostPort.HostPort, readonly timeout: number) {}
}

const config: Config.Config<ServiceConfig> = Config.all([
  Config.nested(HostPort.config, "HOSTPORT"),
  Config.number("TIMEOUT"),
]).pipe(
  Config.map(([hostPort, timeout]) => new ServiceConfig(hostPort, timeout))
)
