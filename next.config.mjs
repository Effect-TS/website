import { nodeTypes } from '@mdx-js/mdx';
import nextra from "nextra";
import rehypeRaw from "rehype-raw";
import remarkShikiTwoslash from "remark-shiki-twoslash";

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.jsx",
  mdxOptions: {
    rehypePlugins: [[rehypeRaw, { passThrough: nodeTypes }]],
    remarkPlugins: [[
      remarkShikiTwoslash.default,
      {
        theme: "dark-plus",
        defaultCompilerOptions: {
          types: ['node'],
        },
      }]],
  }
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
};

export default withNextra(nextConfig);
