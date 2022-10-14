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
        for (const s of source.statements) {
          if (ts.isTypeAliasDeclaration(s) && s.name.text === nameSymbol.name) {
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

      const methods: string[] = []

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
          text += '```ts\n'
          const tags = prop
            .getJsDocTags(checker)
            .filter((t) => t.text != null)
            .map((t) => ({ name: t.name, text: t.text!.map((p) => p.text).join(' ') }))
            .filter((t) => !(t.name === 'tsplus' && t.text.startsWith('location')))
          if (tags.length > 0) {
            text += '/**\n'
            for (const tag of tags) {
              text += ' * @' + tag.name + ' ' + tag.text + '\n'
            }
            text += ' */\n'
          }
          text += `export declare const ${prop.getName()}: ${typeStr};`
          text += '\n```\n\n'
          methods.push(text)
        }
      }

      if (methods.length > 0) {
        text += `## Methods\n\n`
        for (const m of methods) {
          text += m
        }
      }

      fs.writeFileSync(path.join(__dirname, `../content/modules/${specifier.name.getText()}.md`), text)
    }
  }
}
