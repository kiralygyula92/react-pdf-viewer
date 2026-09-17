/** Shiki options for code blocks: one dark theme, no wrapping, horizontally scrollable. */
import type { RehypeShikiOptions } from '@shikijs/rehype';

export const shikiOptions: RehypeShikiOptions = {
  theme: 'github-dark-dimmed',
  defaultLanguage: 'text',
  fallbackLanguage: 'text',
  transformers: [
    {
      pre(node) {
        const style = String(node.properties['style'] ?? '');
        node.properties['style'] = `${style};overflow-x:auto`;
        node.properties['tabindex'] = '0';
        node.properties['data-language'] = this.options.lang;
      },
    },
  ],
};
