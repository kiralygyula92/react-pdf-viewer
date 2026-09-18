import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import satori from 'satori';

const require = createRequire(import.meta.url);
let fonts: { name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[] | undefined;

function loadFonts() {
  fonts ??= [
    {
      name: 'Inter',
      data: readFileSync(require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff')),
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Inter',
      data: readFileSync(require.resolve('@fontsource/inter/files/inter-latin-700-normal.woff')),
      weight: 700,
      style: 'normal',
    },
  ];
  return fonts;
}

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

/** Key symbols the bundled Latin font has no glyph for, spelled out so cards never show boxes. */
const KEY_SYMBOLS: Record<string, string> = {
  '⌘': 'Cmd',
  '⌥': 'Option',
  '⇧': 'Shift',
  '⌃': 'Ctrl',
};
const plainGlyphs = (text: string) =>
  text.replace(/[⌘⌥⇧⌃]/g, (symbol) => KEY_SYMBOLS[symbol] ?? '');

/**
 * Social card (1200×630) generated from a page's title and description: the same
 * template for every docs page, so no card is ever hand-made.
 */
export async function renderOgImage(input: {
  title: string;
  description: string;
  eyebrow: string;
  accent?: string;
}): Promise<Uint8Array> {
  const accent = input.accent ?? '#1d4ed8';
  const text = plainGlyphs(input.description);
  const description = text.length > 180 ? `${text.slice(0, 177)}…` : text;
  const tree = h(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 80px',
      background: 'linear-gradient(135deg, #0b1120 0%, #111c35 60%, #16213b 100%)',
      color: '#e2e8f0',
      fontFamily: 'Inter',
    },
    [
      h('div', { display: 'flex', alignItems: 'center', gap: '18px' }, [
        h('div', {
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${accent}, #22d3ee)`,
        }),
        h('div', { fontSize: '30px', fontWeight: 700, color: '#a8b3c7' }, input.eyebrow),
      ]),
      h('div', { display: 'flex', flexDirection: 'column', gap: '22px' }, [
        h(
          'div',
          {
            fontSize: input.title.length > 32 ? '64px' : '80px',
            fontWeight: 700,
            lineHeight: 1.05,
            color: '#ffffff',
            letterSpacing: '-2px',
          },
          plainGlyphs(input.title),
        ),
        h('div', { fontSize: '32px', lineHeight: 1.35, color: '#a8b3c7' }, description),
      ]),
    ],
  );
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: loadFonts(),
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
