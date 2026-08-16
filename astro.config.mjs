// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import { defineConfig } from "astro/config";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import tailwindcss from "@tailwindcss/vite";

import { rainbowDelimiters } from "./src/plugins/rainbow-delimiters.js";

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
  },
  markdown: {
    // Astro 7 defaults to the Sätteri processor; remark/rehype plugins
    // (KaTeX) require the unified processor.
    processor: unified(),
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      [rehypeKatex, { strict: false, throwOnError: false }],
    ],
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
