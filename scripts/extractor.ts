import ts from 'typescript/lib/tsserverlibrary'
import * as fs from 'node:fs'
import { execSync } from 'node:child_process'
import * as path from 'node:path'

const docFilePath = path.join(__dirname, './docs.ts')

execSync(`rm -rf ${path.join(__dirname, `../content/modules`)}`)
execSync(`mkdir -p ${path.join(__dirname, `../content/modules`)}`)

const program = ts.createProgram({
  rootNames: [docFilePath],
  options: {},
})

const checker = program.getTypeChecker()

const source = program.getSourceFile(docFilePath)!

const exclude = /^[A-Z]\w+$|^_\w+$/

for (const statement of source?.statements) {
  if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
    for (const specifier of statement.exportClause.elements) {
      let text = '## ' + specifier.name.text + '\n\n'
      const nameSymbol = checker.getSymbolAtLocation(specifier.name)
      if (nameSymbol) {
        for (const doc of nameSymbol.getDocumentationComment(checker)) {
          if (doc.kind === 'text') {
            text += doc.text + '\n\n'
          }
        }
      }
      for (const prop of checker
        .getTypeAtLocation(specifier)
        .getProperties()
        .sort((a, b) => (a === b ? 0 : a.getName() > b.getName() ? 1 : -1))) {
        if (!prop.getName().match(exclude)) {
          const type = checker.getTypeOfSymbolAtLocation(prop, statement)
          const typeStr = checker.typeToString(
            type,
            undefined,
            ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
          )
          text += '### ' + prop.getName() + '\n\n'
          for (const doc of prop.getDocumentationComment(checker)) {
            if (doc.kind === 'text') {
              text += doc.text + '\n\n'
            }
          }
          text += '```ts\n' + `export declare const ${prop.getName()}: ${typeStr};` + '\n```\n\n'
        }
      }

      fs.writeFileSync(path.join(__dirname, `../content/modules/${specifier.name.getText()}.md`), text)
    }
  }
}
