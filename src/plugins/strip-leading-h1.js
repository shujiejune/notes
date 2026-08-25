/**
 * Rehype plugin: drop a leading <h1> from the rendered document.
 *
 * Posts display their frontmatter title as the page heading (BlogPost.astro),
 * so a leading "# Title" line in the markdown would render as a duplicate,
 * double-underlined h1 at the top of the body.
 */
export function rehypeStripLeadingH1() {
  return (tree) => {
    const first = tree.children[0];
    if (first?.type === "element" && first.tagName === "h1") {
      tree.children.shift();
    }
  };
}
