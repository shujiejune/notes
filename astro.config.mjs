// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://shujiejune.github.io",
  base: "/sirius",
  integrations: [mdx(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      // Choose your preferred dark theme
      // Popular options: 'tokyo-night', 'dracula', 'vitesse-dark', 'github-dark'
      theme: "tokyo-night",
      wrap: true, // Wraps long lines of code
    },
  },
});
