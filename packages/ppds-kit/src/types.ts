/** Types for the PPDS v1.1 content model (docs/ppds/plugin-site.schema.json). */

export type Archetype = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export type Lifecycle = 'new' | 'preview' | 'beta' | 'planned' | 'deprecated' | 'legacy';

export type SectionId =
  | 'getting-started'
  | 'features'
  | 'demos'
  | 'reference'
  | 'customization'
  | 'guides'
  | 'integrations'
  | 'resources'
  | 'migration'
  | 'discover-more'
  | 'design-resources';

export interface Tier {
  id: string;
  name: string;
  badge?: string | null;
  icon?: string;
  color?: string;
  explainerHref?: string;
}

export interface PluginConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  categoryId?: string | null;
  urlPrefix?: string;
  repo: string;
  currentVersion: string;
  versions?: { label: string; href: string; current?: boolean; supported?: boolean }[];
  tiers: Tier[];
  links?: Record<string, string>;
  taxonomy: string[];
  sections: { id: SectionId; title?: string; enabled?: boolean }[];
  referenceSource?: { kind: string; entry?: string; command?: string };
  branding?: {
    accentColor?: string;
    logoLight?: string;
    logoDark?: string;
    ogImageTemplate?: string;
  };
}

export interface NavNode {
  pathname: string;
  title?: string;
  subheader?: string;
  icon?: string;
  plan?: string;
  lifecycle?: Lifecycle;
  capabilityId?: string;
  children?: NavNode[];
}

/** Portfolio-level data shared by every plugin site (marketing header and footer, PPDS §2). */
export interface PortfolioConfig {
  name: string;
  tagline: string;
  description: string;
  products: string[];
  footer: Record<
    'Products' | 'Resources' | 'Explore' | 'Company',
    { title: string; href: string }[]
  >;
  social?: { label: string; href: string }[];
  copyright: string;
  /**
   * Surfaces the site publishes. Default both; `["docs"]` is a docs-only site for a single
   * product, whose root redirects to the docs (no marketing surface, PPDS §2.1 deviation).
   */
  surfaces?: ('marketing' | 'docs')[];
}

/** One sidebar entry after flattening `nav.json`, with everything templates need. */
export interface NavPage {
  pathname: string;
  title: string;
  description?: string;
  section: SectionId;
  sectionTitle: string;
  group?: string;
  capabilityId?: string;
  plan?: string;
  lifecycle?: Lifecycle;
  archetype: Archetype | null;
  /** Content file relative to the plugin content root, or null for generated pages. */
  sourceFile: string | null;
}

export interface PluginModel {
  contentRoot: string;
  config: PluginConfig;
  nav: NavNode[];
  titles: Record<string, string>;
  pages: NavPage[];
  byPath: Map<string, NavPage>;
}
