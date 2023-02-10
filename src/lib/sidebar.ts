import * as ReadonlyArray from '@fp-ts/core/ReadonlyArray'

export type TreeRoot<K> = ReadonlyArray<TreeNode<K>>

export type TreeNode<K> = K & {
  url: string
  children: ReadonlyArray<TreeNode<K>>
}

/**
 * Represents navigation metadata that is used to group and sort navigation
 * links in the sidebar.
 */
export interface NavigationMetadata {
  /**
   * The order of the navigation item. This is used to sort the navigation items
   * in the sidebar.
   */
  readonly order: number
  /**
   * The path segment of the URL. For example, `/docs/200-creating-effects` will
   * be resolve to `'creating-effects'`.
   */
  readonly path: string
}

/**
 * Constructs a sidebar tree from a list of documents.
 *
 * @param documents The documents to construct the tree from.
 * @param parentPath The path of the parent node in the tree. Used to filter the
 * documents when constructing the sidebar tree to only contain those that are
 * children of the parent node.
 */
export const makeTree = <K extends { navigationMetadata: ReadonlyArray<NavigationMetadata> }>(
  documents: ReadonlyArray<K>,
  parentPath: ReadonlyArray<string> = [],
): TreeRoot<K> => {
  const level = parentPath.length
  return documents
    .filter(
      (doc) =>
        doc.navigationMetadata.length === level + 1 &&
        doc.navigationMetadata
          .map((meta) => meta.path)
          .join('/')
          .startsWith(parentPath.join('/')),
    )
    .sort((a, b) => a.navigationMetadata[level].order - b.navigationMetadata[level].order)
    .map((doc) => ({
      ...doc,
      url: '/docs/' + doc.navigationMetadata.map((meta) => meta.path).join('/'),
      children: makeTree(
        documents,
        doc.navigationMetadata.map((meta) => meta.path),
      ),
    }))
}
