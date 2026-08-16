# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

Sirius is a personal blog built with [Astro 7](https://docs.astro.build) (static output, no SSR/framework UI components) and Tailwind CSS v4. It is bilingual (Traditional/Simplified Chinese with an English fallback) and deploys to GitHub Pages as a project site at `https://shujiejune.github.io/sirius/` — the `site` and `base` values in `astro.config.mjs` must stay in sync with this. Requires Node.js ≥ 22.12.

## Commands

Use [pnpm](https://pnpm.io) as the package manager. The exact version is pinned via `packageManager` in `package.json`, the lockfile is `pnpm-lock.yaml` (never commit a `package-lock.json`/`bun.lock`), and dependency build-script allowlists live in `pnpm-workspace.yaml` (pnpm v10+ runs postinstall scripts only for allowlisted packages). CI uses pnpm on Node 24.

- `pnpm install` — install dependencies
- `pnpm dev` — dev server at `localhost:4321`
- `pnpm build` — production build to `./dist/`
- `pnpm preview` — preview the built site
- `pnpm astro check` — type-check `.astro`/TS files (run this before considering work done). Requires the `@astrojs/check` and `typescript` devDependencies (already installed); TypeScript must stay on 6.x — the TS 7 native compiler does not yet expose the API `astro check` needs.

## Project Structure

- `src/pages/` — file-based routes: home (`index.astro`), `about.astro`, `projects.astro`, and `blog/[...slug].astro` (renders posts via `getStaticPaths` + `render()`), plus `rss.xml.js`.
- `src/content/blog/` — blog posts as Markdown/MDX. Validated by the schema in `src/content.config.ts`: `title`, `description`, `pubDate` are required; `updatedDate`, `heroImage` (use the `image()` helper so Astro optimizes it), and `tags` are optional.
- `src/layouts/` — `Layout.astro` (base), `BlogPost.astro` (post detail with table of contents and word count), `Portfolio.astro`.
- `src/components/` — Astro components only (no React/Vue/Svelte).
- `src/consts.ts` — single source of truth for site metadata (`SITE_TITLE`, `SITE_DESCRIPTION`, `SITE_AUTHOR`, `SITE_SIGNATURE`) and social links. Edit here rather than hardcoding in layouts/components.
- `src/utils/` — plain JavaScript with JSDoc (e.g. `calculateWordCount` handles CJK + English word counting).
- `src/assets/` — self-hosted fonts and images processed by the build; `public/` is for unprocessed static files.
- `.github/workflows/deploy.yml` — on push to `main`, builds with pnpm and publishes `dist/` to GitHub Pages.

## Styling

Tailwind v4 is configured **CSS-first** in `src/styles/global.css` (`@import "tailwindcss"`, `@theme` tokens, `@plugin "@tailwindcss/typography"`). Do not add a `tailwind.config.js`; `tailwind.congif.mjs` in the repo root is a leftover v3-style file (note the filename typo) and is not loaded by the v4 Vite plugin in `astro.config.mjs`.

Conventions:

- Theming uses `--color-skin-*` tokens (`skin-base`, `skin-accent`, `skin-fill`, `skin-card`, `skin-line`) that reference RGB CSS variables set per color scheme — prefer these utilities (e.g. `text-skin-base`, `border-skin-line`) over raw colors so dark mode keeps working.
- Fonts are self-hosted `.woff2` files in `src/assets/fonts/`, registered via `@font-face` in `src/styles/global.css`. To replace a font, convert TTF/OTF with `./ttf-2-woff.sh` and update the matching `@font-face` block; font-family utilities come from the `--font-display` / `--font-sans` / `--font-mono` theme variables.
- Code blocks are highlighted with Shiki (`tokyo-night`, `wrap: true`) — configured in `astro.config.mjs`, not in CSS.

## Language / i18n

There is no i18n routing framework. Pages set `<html lang>` (default `zh-Hant`), and `LangToggleButton.astro` toggles `document.documentElement.lang` between `zh-Hant`/`zh-Hans`, persisting to `localStorage["preferred-lang"]`. Font stacks switch via `:lang(zh-Hant)` / `:lang(zh-Hans)` rules in `global.css`. When adding copy, keep it Chinese-first and avoid baking language assumptions into CSS outside these hooks.

## Conventions

- TypeScript strict mode (`astro/tsconfigs/strict`); path aliases `@components/*`, `@layouts/*`, `@objects/*`, `@assets/*`, `@utils/*` (see `tsconfig.json`). Import Zod as `import { z } from "astro/zod"` — the `z` re-export from `astro:content` is deprecated.
- Astro 7 uses the Rust compiler, which is stricter than the old Go compiler: unclosed or invalidly nested tags are build errors, not silently corrected. `compressHTML` defaults to `'jsx'`, so put explicit whitespace (e.g. `{" "}`) between inline elements that must stay separated.
- Commit messages follow Conventional Commits with a scope, e.g. `feat(components): ...`, `fix(utils): ...`, `chore: ...`.
- Pushing to `main` triggers a live deployment — keep commits to `main` build-clean.
