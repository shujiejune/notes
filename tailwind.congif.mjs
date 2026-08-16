/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      textColor: {
        skin: {
          base: "rgb(var(--color-text-base) / <alpha-value>)",
          accent: "rgb(var(--color-accent) / <alpha-value>)",
        },
      },
      backgroundColor: {
        skin: {
          fill: "rgb(var(--color-fill) / <alpha-value>)",
          accent: "rgb(var(--color-accent) / <alpha-value>)",
          card: "rgb(var(--color-card) / <alpha-value>)",
        },
      },
      borderColor: {
        skin: {
          line: "rgb(var(--color-line) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
