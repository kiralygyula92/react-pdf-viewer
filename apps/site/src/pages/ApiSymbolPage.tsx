/** Generated reference page (archetype E), one per public symbol (PPDS §6 E, §8.4–8.5). */
import type { ReactNode } from 'react';
import { loadReference, optionsHeading, type NavPage, type ReferenceEntry } from 'ppds-kit';
import { DocsLayout } from 'ppds-kit/components';
import {
  CONTENT_PATH,
  CONTENT_ROOT,
  feeds,
  getDescriptions,
  getModel,
  getPortfolio,
  injectedNav,
  pageMeta,
  PLUGIN_ID,
  twin,
} from '../lib/site.ts';

type OptionRow = [
  string,
  ReferenceEntry['schema']['options'] extends infer O
    ? O extends Record<string, infer V>
      ? V
      : never
    : never,
];

function Rows({
  entries,
  prose = {},
  events = false,
}: {
  entries: OptionRow[];
  prose?: Record<string, string> | undefined;
  events?: boolean | undefined;
}) {
  return (
    <tbody>
      {entries.map(([name, option]) => (
        <tr key={name} id={events ? undefined : `option-${name.replace(/[^A-Za-z0-9-]/g, '-')}`}>
          <td>
            <code>{name}</code>
            {!events && option.deprecated && (
              <em className="ppds-reference__deprecated"> (deprecated)</em>
            )}
          </td>
          <td>
            <code>{option.type.description ?? option.type.name}</code>
          </td>
          <td>
            {events || option.default === undefined ? '—' : <code>{String(option.default)}</code>}
          </td>
          <td>{option.required ? 'Yes' : 'No'}</td>
          <td dangerouslySetInnerHTML={{ __html: prose[name] ?? '' }} />
        </tr>
      ))}
    </tbody>
  );
}

function TableHead() {
  return (
    <thead>
      <tr>
        <th scope="col">Name</th>
        <th scope="col">Type</th>
        <th scope="col">Default</th>
        <th scope="col">Required</th>
        <th scope="col">Description</th>
      </tr>
    </thead>
  );
}

export function ApiSymbolPage({ name, assets }: { name: string; assets: ReactNode }) {
  const model = getModel();
  const reference = loadReference(CONTENT_ROOT);
  const entry = reference.symbols.get(name) as ReferenceEntry;
  const { schema, strings } = entry;
  const pathname = `/${PLUGIN_ID}/api/${entry.slug}/`;
  const title = `${schema.name} reference`;
  const description = (strings.symbolDescription ?? '').replace(/<[^>]+>/g, '');
  const page: NavPage = {
    pathname,
    title: schema.name,
    section: 'reference',
    sectionTitle: model.titles[`/${PLUGIN_ID}/api-group`] ?? 'Reference',
    archetype: 'E',
    sourceFile: null,
  };
  const descriptions = getDescriptions();
  const optionRows = Object.entries(schema.options ?? {}) as OptionRow[];
  const eventRows = Object.entries(schema.events ?? {}) as OptionRow[];
  const heading = optionsHeading(schema.kind);
  const headings = [
    { depth: 2, slug: 'used-by', text: 'Used by' },
    { depth: 2, slug: 'import', text: 'Import' },
    ...(optionRows.length ? [{ depth: 2, slug: 'options', text: heading }] : []),
    ...(eventRows.length ? [{ depth: 2, slug: 'events', text: 'Events' }] : []),
    ...(schema.classes?.length ? [{ depth: 2, slug: 'css-classes', text: 'CSS classes' }] : []),
    { depth: 2, slug: 'source', text: 'Source' },
  ];

  return (
    <DocsLayout
      model={model}
      portfolio={getPortfolio()}
      page={page}
      meta={pageMeta(page, title, description)}
      headings={headings}
      descriptions={descriptions}
      generatedFrom={schema.filename}
      twin={twin(pathname)}
      feeds={feeds}
      injectedNav={injectedNav()}
      assets={assets}
    >
      <header className="ppds-article__header">
        <h1 className="ppds-article__title">{title}</h1>
        <p
          className="ppds-article__subtitle"
          data-description
          dangerouslySetInnerHTML={{ __html: strings.symbolDescription ?? '' }}
        />
      </header>
      <div className="ppds-prose ppds-reference" data-kind={schema.kind}>
        <h2 id="used-by">Used by</h2>
        {(schema.usedBy ?? []).length ? (
          <ul>
            {(schema.usedBy ?? []).map((usedBy) => (
              <li key={usedBy}>
                <a href={usedBy}>{model.byPath.get(usedBy)?.title ?? usedBy}</a>
              </li>
            ))}
          </ul>
        ) : (
          <p data-internal>Internal building block: not documented on a capability page.</p>
        )}

        <h2 id="import">Import</h2>
        {/* Focusable so keyboard users can scroll a long line (axe scrollable-region-focusable). */}
        {/* eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex */}
        <pre tabIndex={0}>
          <code>{(schema.imports ?? []).join('\n')}</code>
        </pre>
        {schema.signature && (
          <p>
            Signature: <code>{schema.signature}</code>
            {schema.returns && (
              <>
                {' '}
                → <code>{schema.returns}</code>
              </>
            )}
          </p>
        )}

        {optionRows.length > 0 && (
          <>
            <h2 id="options">{heading}</h2>
            <div className="ppds-table-scroll" role="region" tabIndex={0} aria-label={heading}>
              <table>
                <TableHead />
                <Rows entries={optionRows} prose={strings.optionDescriptions} />
              </table>
            </div>
          </>
        )}

        {eventRows.length > 0 && (
          <>
            <h2 id="events">Events</h2>
            <div className="ppds-table-scroll" role="region" tabIndex={0} aria-label="Events">
              <table>
                <TableHead />
                <Rows entries={eventRows} prose={strings.eventDescriptions} events />
              </table>
            </div>
          </>
        )}

        {schema.classes && schema.classes.length > 0 && (
          <>
            <h2 id="css-classes">CSS classes</h2>
            <div className="ppds-table-scroll" role="region" tabIndex={0} aria-label="CSS classes">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Key</th>
                    <th scope="col">Class</th>
                    <th scope="col">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {schema.classes.map((item) => (
                    <tr key={item.key}>
                      <td>{item.key}</td>
                      <td>
                        <code>{item.className}</code>
                      </td>
                      <td>{strings.classDescriptions?.[item.key]?.description ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h2 id="source">Source</h2>
        <p>
          <a href={schema.sourceUrl ?? `${model.config.repo}/blob/main/${schema.filename}`}>
            {schema.filename}
          </a>
        </p>
        <p className="ppds-reference__note">
          Generated from{' '}
          <code>
            {CONTENT_PATH}/reference/{entry.slug}.schema.json
          </code>
          . Do not edit by hand.
        </p>
      </div>
    </DocsLayout>
  );
}
