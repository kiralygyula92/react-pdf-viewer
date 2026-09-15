/** Generated reference structure (PPDS §8.4). Never hand-edited (conformance check 10). */
export interface ReferenceOption {
  type: { name: string; description?: string };
  default?: string | number | boolean | null;
  required?: boolean;
  deprecated?: boolean;
}

export interface ReferenceSchema {
  name: string;
  kind:
    'component' | 'function' | 'hook' | 'type' | 'setting-group' | 'command' | 'event' | 'filter';
  imports?: string[];
  /** Call signature for functions and hooks, e.g. `usePdfDocument(source, options?)`. */
  signature?: string;
  returns?: string;
  options?: Record<string, ReferenceOption>;
  events?: Record<string, ReferenceOption>;
  classes?: { key: string; className: string }[];
  inheritance?: { symbol: string; pathname: string } | null;
  usedBy?: string[];
  filename: string;
  sourceUrl?: string;
}

/** Human prose for a symbol (PPDS §8.5). Regeneration only ever adds keys. */
export interface ReferenceStrings {
  symbolDescription?: string;
  optionDescriptions?: Record<string, string>;
  eventDescriptions?: Record<string, string>;
  classDescriptions?: Record<string, { description: string }>;
}

export interface ReferenceEntry {
  slug: string;
  schema: ReferenceSchema;
  strings: ReferenceStrings;
}
