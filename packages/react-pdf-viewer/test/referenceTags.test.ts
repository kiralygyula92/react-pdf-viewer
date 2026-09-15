// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getShortcut } from '../src/hooks/useKeyboardShortcuts';

/*
 * The generated reference reads keyboard shortcuts (`@shortcut`) and root state attributes
 * (`@cssAttribute`) from TSDoc tags. These tests keep the tags and the implementation in sync.
 */
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const tags = (source: string, tag: string) =>
  [...source.matchAll(new RegExp(`@${tag} (\\S+) (.+)`, 'g'))].map((match) => ({
    name: match[1] ?? '',
    text: match[2] ?? '',
  }));

describe('reference tags', () => {
  it('documents every keyboard shortcut the viewer handles, and nothing else', () => {
    const documented = tags(read('../src/types.ts'), 'shortcut');
    const viewerTags = documented.filter((tag) => !tag.name.startsWith('Ctrl+'));
    for (const tag of viewerTags) {
      const key = tag.name.replace(/^Shift\+/, '');
      const event = new KeyboardEvent('keydown', { key });
      expect(getShortcut(event, null), `@shortcut ${tag.name}`).not.toBeNull();
    }
    const hook = read('../src/hooks/useKeyboardShortcuts.ts');
    const mapping = hook.slice(
      hook.indexOf('export function getShortcut'),
      hook.indexOf('interface UseKeyboardShortcutsOptions'),
    );
    const handled = [...mapping.matchAll(/case '([^']+)':/g)].map((match) => match[1] ?? '');
    const mentioned = viewerTags.flatMap((tag) => [
      tag.name.replace(/^Shift\+/, ''),
      ...[...tag.text.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? ''),
    ]);
    const undocumented = handled.filter(
      (key) => !mentioned.includes(key) && !mentioned.includes(key.toLowerCase()),
    );
    expect(undocumented).toEqual([]);
  });

  it('documents every data attribute on the viewer root', () => {
    const source = read('../src/PdfViewer.tsx');
    const documented = tags(source, 'cssAttribute')
      .map((tag) => tag.name)
      .sort();
    const rendered = [...source.matchAll(/^\s+(data-[a-z]+)=\{/gm)].map((match) => match[1]).sort();
    expect(documented).toEqual(rendered);
  });
});
