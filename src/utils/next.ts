import type {
  GetServerSideProps,
  GetStaticPaths,
  GetStaticProps,
  PreviewData,
  GetStaticPropsContext,
  GetStaticPropsResult,
} from 'next'
import { ParsedUrlQuery } from 'querystring'

/** Needed in combination with `InferGetServerSidePropsType` */
export function defineServerSideProps<Fn extends GetServerSideProps>(fn: Fn): Fn {
  return fn
}

/** Needed in combination with `InferGetStaticPropsType` */
export function defineStaticProps<
  P extends GetStaticPropsResult<any>,
  Q extends ParsedUrlQuery = ParsedUrlQuery,
  D extends PreviewData = PreviewData,
>(
  fn: (context: GetStaticPropsContext<Q, D>) => Promise<P> | P,
): GetStaticProps<Extract<P, { props: any }>['props'], Q, D> {
  return fn
}

export function defineStaticPaths<Fn extends GetStaticPaths>(fn: Fn): Fn {
  return fn
}

export function toParams(path: string): { params: { slug: string[] } } {
  return { params: { slug: path.replace(/^\//, '').split('/') } }
}

export function notUndefined<T>(_: T | undefined): _ is T {
  return _ !== undefined
}
