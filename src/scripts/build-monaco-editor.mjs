// ts-check

/**
 * Original Source: https://github.com/microsoft/TypeScript-Make-Monaco-Builds/blob/master/publish-monaco-editor.js
 *
 * MIT License
 *
 * Copyright (c) Microsoft Corporation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { execSync } from "child_process"
import { existsSync } from "fs"

const args = process.argv.slice(2);

const exec = (cmd, opts) => {
  console.log(`> ${cmd} ${opts ? JSON.stringify(opts) : ""}`);
  try {
    return execSync(cmd, opts);
  } catch (error) {
    console.log("Command Failed:")
    console.log("STDOUT:" + error.stdout.toString())
    console.log("STDERR:" + error.stderr.toString())
    throw error
  }
};

const failableMergeBranch = (exec, name) => {
  try {
    exec(`git merge ${name}`)
  } catch (e) {
    // NOOP
  }
}


// So, you can run this locally
const envUser = process.env.USER_ACCOUNT || "effect"

// For example:
//   USER_ACCOUNT="my-custom-user" node ./src/scripts/build-monaco-editor.mjs next

const step = msg => console.log("\n\n - " + msg);

function main() {
    // TypeScript calls nightlies next... So should we.
  const typescriptTag = args[0] ? args[0] : "next"
  const typescriptModuleName = args[1] ? args[1] : "typescript"

  console.log("## Creating build of Monaco Editor");
  process.stdout.write("> node publish-monaco-editor.js");

  const execME = cmd => exec(cmd, { cwd: "monaco-editor" });

  // Create a tarball of the current version
  step("Cloning the repo");

  if (existsSync("monaco-editor")) exec("rm -rf monaco-editor")
  exec("git clone https://github.com/microsoft/monaco-editor.git");


  // Add typescript to the tsWorker export
  // https://github.com/microsoft/monaco-editor/pull/2775
  step("Merging in open PRs we want");
  execME("git remote add andrewbranch https://github.com/andrewbranch/monaco-editor.git")
  execME("git fetch andrewbranch")
  failableMergeBranch(execME, "andrewbranch/update-ts")

  execME("git remote add jakebailey https://github.com/jakebailey/monaco-editor.git")
  execME("git fetch jakebailey")
  failableMergeBranch(execME, "jakebailey/fix-compile-regex-parse")
  failableMergeBranch(execME, "jakebailey/emit-file-diagnostics")

  execME("git rev-parse HEAD")

  const user = envUser || exec("npm whoami").toString().trim();

  step("Renaming");
  execME(`json -I -f package.json -e "this.name='@${user}/monaco-editor'"`);

  step("Removing TypeDoc because its ships its own version of TypeScript and npm complains");
  execME(`npm remove typedoc`)

  step("Updating @types/node to ensure we compile on newer versions of TypeScript");
  execME(`npm update @types/node`);

  step("Overwriting the version of TypeScript");
  if (typescriptModuleName === "typescript") {
    execME(`npm install --save "typescript@${typescriptTag}" --force`)
  } else {
    execME(`npm install --save "typescript@npm:${typescriptModuleName}@${typescriptTag}" --force`)
  }

  step("Matching the versions");

  const typeScriptVersion = execME("json -f node_modules/typescript/package.json version").toString().trim();
  execME(`json -I -f package.json -e "this.version='${typeScriptVersion}'"`);

  step("Creating release folder");
  execME(`npm run build-monaco-editor`);

  step("Updating TS in monaco-typescript");
  execME(`npm run import-typescript`);

  step("Re-running release");
  execME(`npm run build-monaco-editor`);

  step("Copying minimal VSCode build to public directory");
  if (existsSync("./public/vendor/vs")) exec("rm -rf ./public/vendor/vs")
  exec("mv ./monaco-editor/out/monaco-editor/min/vs ./public/vendor/");

  step("Cleaning up monaco editor");
  exec("rm -rf monaco-editor");

  step("Done!");
}

main();