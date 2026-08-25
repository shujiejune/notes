// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import { defineConfig } from "astro/config";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGithubBlockquoteAlert from "remark-github-blockquote-alert";

import tailwindcss from "@tailwindcss/vite";

import { rainbowDelimiters } from "./src/plugins/rainbow-delimiters.js";
import { rehypeStripLeadingH1 } from "./src/plugins/strip-leading-h1.js";

// The "/notes" base is only required for the GitHub Pages build (project site).
// Serve the dev server from the root instead of /notes for convenience.
const isDev = process.argv.includes("dev");

// https://astro.build/config
export default defineConfig({
  site: "https://shujiejune.github.io",
  base: isDev ? "/" : "/notes",
  integrations: [mdx(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
    build: {
      // Never inline webfonts as base64: the CJK faces rely on unicode-range
      // slicing, and inlining forces every slice into the render-blocking CSS.
      // false = never inline; undefined = default threshold for everything else.
      assetsInlineLimit: (filePath) => (filePath.endsWith(".woff2") ? false : undefined),
    },
  },
  markdown: {
    // Astro 7 defaults to the Sätteri processor; remark/rehype plugins
    // (KaTeX, GitHub alerts) require the unified processor, configured here.
    processor: unified({
      remarkPlugins: [remarkMath, remarkGithubBlockquoteAlert],
      rehypePlugins: [
        rehypeStripLeadingH1,
        [rehypeKatex, { strict: false, throwOnError: false }],
      ],
    }),
    shikiConfig: {
      // Dual themes: spans carry `color` (light) + `--shiki-dark` (dark).
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      wrap: true,
      // Rainbow-colored paired brackets, matching rainbow-delimiters.nvim.
      transformers: [rainbowDelimiters()],
    },
  },
});
