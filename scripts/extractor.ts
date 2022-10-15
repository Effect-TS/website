import ts from 'typescript/lib/tsserverlibrary'
import * as fs from 'node:fs'
import { execSync } from 'node:child_process'
import * as path from 'node:path'

const paths = [
  path.join(__dirname, './effect/io.ts'),
  path.join(__dirname, './effect/stream.ts'),
  path.join(__dirname, './fp-ts/core.ts'),
  path.join(__dirname, './fp-ts/data.ts'),
]

execSync(`rm -rf ${path.join(__dirname, `../content/reference`)}`)
execSync(`mkdir -p ${path.join(__dirname, `../content/reference`)}`)

const program = ts.createProgram({
  rootNames: paths,
  options: {},
})

const checker = program.getTypeChecker()
const exclude = /^[A-Z]\w+$|^_\w+$/

for (const filePath of paths) {
  const source = program.getSourceFile(filePath)!

  for (const statement of source.statements) {
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
          const models: string[] = []
          for (const tag of nameSymbol.getJsDocTags(checker)) {
            if (tag.name === 'model') {
              const text = tag.text?.map((s) => s.text).join(' ')
              if (text) {
                models.push(text)
              }
            }
          }

          for (const s of source.statements) {
            if (ts.isTypeAliasDeclaration(s) && (s.name.text === nameSymbol.name || models.includes(s.name.text))) {
              const type = checker.getTypeAtLocation(s.name)
              const symbol: ts.Symbol | undefined =
                type.symbol ??
                (type.aliasSymbol && ts.isTypeReferenceNode(s.type)
                  ? checker.getSymbolAtLocation(s.type.typeName)
                  : undefined)
              if (symbol) {
                const declaration = symbol
                  .getDeclarations()
                  ?.find(
                    (d) => ts.isInterfaceDeclaration(d) || ts.isTypeAliasDeclaration(d) || ts.isClassDeclaration(d),
                  ) as (ts.Declaration & { name: ts.Identifier }) | undefined
                if (declaration) {
                  const docs = checker.getSymbolAtLocation(declaration.name)?.getDocumentationComment(checker) ?? []
                  for (const doc of docs) {
                    if (doc.kind === 'text') {
                      text += doc.text + '\n\n'
                    }
                  }
                  text += '```ts\n'
                  text += declaration.getText()
                  text += '\n```\n\n'
                }
              }
            }
          }
        }

        const methods: Record<string, string[]> = {}

        for (const prop of checker
          .getTypeAtLocation(specifier)
          .getProperties()
          .sort((a, b) => (a === b ? 0 : a.getName() > b.getName() ? 1 : -1))) {
          if (!prop.getName().match(exclude)) {
            let text = ''
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
            let category: string | undefined = undefined
            let since: string | undefined = undefined
            for (const tag of prop.getJsDocTags(checker)) {
              if (tag.name === 'category' && tag.text && tag.text.length === 1) {
                category = tag.text.map((p) => p.text)[0]
              }
              if (tag.name === 'since' && tag.text && tag.text.length === 1) {
                since = tag.text.map((p) => p.text)[0]
              }
            }
            if (typeof category === 'undefined') {
              category = 'method'
            }
            category = category.charAt(0).toUpperCase() + category.slice(1)
            text += '```ts\n'
            text += `export declare const ${prop.getName()}: ${typeStr};`
            text += '\n```\n\n'
            if (since) {
              text += `Added in: ${since}\n\n`
            }
            if (!(category in methods)) {
              methods[category] = []
            }
            methods[category].push(text)
          }
        }

        if (Object.keys(methods).length > 0) {
          for (const category of Object.keys(methods).sort()) {
            text += `## ${category}\n\n`
            for (const line of methods[category]) {
              text += line
            }
          }
        }

        const dirName = path.join(
          __dirname,
          `../content/reference/${path.relative(__dirname, source.fileName.replace('.ts', ''))}`,
        )

        execSync(`mkdir -p ${dirName}`)

        fs.writeFileSync(path.join(dirName, `/${specifier.name.getText()}.md`), text)
      }
    }
  }
}
