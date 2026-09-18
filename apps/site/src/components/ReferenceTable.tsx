/**
 * A compact table of one generated reference symbol's members, for use inside a capability page:
 * `<ReferenceTable symbol="Keyboard shortcuts" format="keys" />`. The rows come from
 * `content/react-pdf-viewer/reference/`, so the page can never drift from the source.
 */
import { Fragment } from 'react';
import { loadReference } from 'ppds-kit';
import { ScrollTable } from 'ppds-kit/components';
import { CONTENT_ROOT, PLUGIN_ID } from '../lib/site.ts';

export interface ReferenceTableProps {
  symbol: string;
  /** How names render: `keys` as keyboard keys, `code` as inline code. */
  format?: 'keys' | 'code';
  nameHeading?: string;
  descriptionHeading?: string;
}

export function ReferenceTable({
  symbol,
  format = 'code',
  nameHeading = 'Name',
  descriptionHeading = 'Description',
}: ReferenceTableProps) {
  const entry = loadReference(CONTENT_ROOT).symbols.get(symbol);
  if (!entry) throw new Error(`ReferenceTable: no generated reference for "${symbol}"`);
  const rows = Object.keys(entry.schema.options ?? {}).map((name) => ({
    name,
    keys: name === '+' ? ['+'] : name.split('+'),
    description: entry.strings.optionDescriptions?.[name] ?? '',
  }));
  return (
    <>
      <ScrollTable>
        <thead>
          <tr>
            <th scope="col">{nameHeading}</th>
            <th scope="col">{descriptionHeading}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>
                {format === 'keys' ? (
                  row.keys.map((key, index) => (
                    <Fragment key={key}>
                      {index > 0 && ' + '}
                      <kbd>{key}</kbd>
                    </Fragment>
                  ))
                ) : (
                  <code>{row.name}</code>
                )}
              </td>
              <td dangerouslySetInnerHTML={{ __html: row.description }} />
            </tr>
          ))}
        </tbody>
      </ScrollTable>
      <p className="ppds-reference-source">
        Generated from the source; see the{' '}
        <a href={`/${PLUGIN_ID}/api/${entry.slug}/`}>{entry.schema.name} reference</a>.
      </p>
    </>
  );
}
