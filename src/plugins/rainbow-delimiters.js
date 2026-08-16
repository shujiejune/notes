/**
 * Shiki transformer implementing rainbow delimiters, the same effect as
 * https://github.com/hiphish/rainbow-delimiters.nvim: a pair of matching
 * brackets shares one color, and each nesting level cycles through the
 * palette. Colors mirror the Krypton 2 theme (github-light/github-dark).
 *
 * Operates on the final HAST tree (not the token stream) so it works with
 * dual themes, where the `tokens` hook runs once per theme and would
 * corrupt the light/dark color mapping.
 */
const OPEN_TO_CLOSE = { "(": ")", "[": "]", "{": "}" };
const CLOSE_TO_OPEN = { ")": "(", "]": "[", "}": "{" };
const BRACKET_RE = /[()[\]{}]/;

// [depth % n] = [lightColor, darkColor]
const DEFAULT_PALETTE = [
  ["#005CC5", "#79B8FF"],
  ["#E36209", "#FFAB70"],
  ["#5A32A3", "#B392F0"],
];

/**
 * @param {Array<[string, string]>} palette
 */
export function rainbowDelimiters(palette = DEFAULT_PALETTE) {
  const colorFor = (depth) => palette[depth % palette.length];

  return {
    name: "rainbow-delimiters",
    /**
     * Walk the rendered `pre > code > span.line > span(token)` tree and
     * split bracket characters into their own spans, colored by nesting
     * depth. A depth stack makes each closing bracket reuse its opener's
     * color.
     */
    root(hast) {
      const /** @type {number[]} */ stack = [];

      const visitLine = (line) => {
        if (!line.children) return;
        const newChildren = [];
        for (const token of line.children) {
          const text = token.children?.[0];
          if (
            token.tagName !== "span" ||
            text?.type !== "text" ||
            typeof text.value !== "string" ||
            !BRACKET_RE.test(text.value)
          ) {
            newChildren.push(token);
            continue;
          }
          let buf = "";
          const flushBuf = () => {
            if (buf) {
              newChildren.push(makeSpan(token, buf));
              buf = "";
            }
          };
          for (const ch of text.value) {
            if (OPEN_TO_CLOSE[ch]) {
              flushBuf();
              const depth = stack.length;
              stack.push(depth);
              newChildren.push(makeBracketSpan(colorFor(depth), ch));
            } else if (CLOSE_TO_OPEN[ch]) {
              flushBuf();
              const depth = stack.length > 0 ? stack.pop() : 0;
              newChildren.push(makeBracketSpan(colorFor(depth), ch));
            } else {
              buf += ch;
            }
          }
          flushBuf();
        }
        line.children = newChildren;
      };

      const walk = (node) => {
        // Shiki's hast sets the raw `class` property (not `className`)
        const cls = node.properties?.class ?? node.properties?.className;
        const classes = Array.isArray(cls) ? cls : typeof cls === "string" ? cls.split(/\s+/) : [];
        if (node.type === "element" && classes.includes("line")) {
          visitLine(node);
          return;
        }
        for (const child of node.children ?? []) {
          if (child.type === "element") walk(child);
        }
      };
      walk(hast);
    },
  };
}

function makeSpan(token, value) {
  return {
    type: "element",
    tagName: "span",
    properties: { ...token.properties },
    children: [{ type: "text", value }],
  };
}

function makeBracketSpan([light, dark], ch) {
  return {
    type: "element",
    tagName: "span",
    properties: { style: `color:${light};--shiki-dark:${dark}` },
    children: [{ type: "text", value: ch }],
  };
}
