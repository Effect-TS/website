import { spawn } from "node:child_process"
const child = spawn(
  process.execPath,
  ["-e", "setInterval(() => {}, 1000); console.log('child-started')"],
  { stdio: "inherit" },
)
console.log("parent pid", process.pid, "child pid", child.pid)
let n = 0
setInterval(() => console.log("tick", n++), 500)
