export type BaseDoc = { pathSegments: { order: number; pathName: string }[] }

export type TreeRoot<K> = TreeNode<K>[]

export type TreeNode<K> = K & {
  urlPath: string
  children: TreeNode<K>[]
}

export type PathSegment = { order: number; pathName: string }

export const buildTreeNode = <K extends BaseDoc>(docs: K[], parentPathNames: string[] = []): TreeNode<K>[] => {
  const level = parentPathNames.length

  return docs
    .filter(
      (_) =>
        _.pathSegments.length === level + 1 &&
        _.pathSegments
          .map((_: PathSegment) => _.pathName)
          .join('/')
          .startsWith(parentPathNames.join('/')),
    )
    .sort((a, b) => a.pathSegments[level].order - b.pathSegments[level].order)
    .map<TreeNode<K>>((doc) => ({
      ...doc,
      urlPath: '/docs/' + doc.pathSegments.map((_: PathSegment) => _.pathName).join('/'),
      children: buildTreeNode(
        docs,
        doc.pathSegments.map((_: PathSegment) => _.pathName),
      ),
    }))
}
