/**
 * Rehype plugin: exports the page's headings from the compiled MDX module, so layouts can build a
 * table of contents. Runs after `rehype-slug`, so the slugs are the ids in the HTML.
 */
import { valueToEstree } from 'estree-util-value-to-estree';
import { toString } from 'hast-util-to-string';
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

export function rehypeHeadings() {
  return (tree: Root) => {
    const headings: Heading[] = [];
    visit(tree, 'element', (node: Element) => {
      const level = /^h([1-6])$/.exec(node.tagName)?.[1];
      if (!level) return;
      headings.push({
        depth: Number(level),
        slug: String(node.properties?.['id'] ?? ''),
        text: toString(node),
      });
    });
    tree.children.unshift({
      type: 'mdxjsEsm',
      value: `export const headings = ${JSON.stringify(headings)};`,
      data: {
        estree: {
          type: 'Program',
          sourceType: 'module',
          comments: [],
          body: [
            {
              type: 'ExportNamedDeclaration',
              specifiers: [],
              attributes: [],
              source: null,
              declaration: {
                type: 'VariableDeclaration',
                kind: 'const',
                declarations: [
                  {
                    type: 'VariableDeclarator',
                    id: { type: 'Identifier', name: 'headings' },
                    init: valueToEstree(headings),
                  },
                ],
              },
            },
          ],
        },
      },
    } as never);
  };
}
