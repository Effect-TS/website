import { GetStaticProps, GetStaticPropsContext, GetStaticPropsResult, PreviewData } from 'next'
import { ParsedUrlQuery } from 'querystring'

/**
 * Needed in combination with `InferGetStaticPropsType`
 */
export const defineStaticProps = <
  P extends GetStaticPropsResult<any>,
  Q extends ParsedUrlQuery = ParsedUrlQuery,
  D extends PreviewData = PreviewData,
>(
  fn: (context: GetStaticPropsContext<Q, D>) => Promise<P> | P,
): GetStaticProps<Extract<P, { props: any }>['props'], Q, D> => fn
