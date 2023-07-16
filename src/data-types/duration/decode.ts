import { Duration } from "effect"

Duration.decode(10n) // same as Duration.nanos(10)
Duration.decode(100) // same as Duration.millis(100)
Duration.decode(Infinity) // same as Duration.infinity

Duration.decode("10 nanos") // same as Duration.nanos(10)
Duration.decode("20 micros") // same as Duration.micros(20)
Duration.decode("100 millis") // same as Duration.millis(100)
Duration.decode("2 seconds") // same as Duration.seconds(2)
Duration.decode("5 minutes") // same as Duration.minutes(5)
Duration.decode("7 hours") // same as Duration.hours(7)
Duration.decode("3 weeks") // same as Duration.weeks(3)
