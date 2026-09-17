/**
 * Browser entry for the docs pages: the shell behaviours (theme, search, sidebar, table of
 * contents) and the demo islands, which mount where the server left a placeholder.
 */
import { initShell } from 'ppds-kit/client/shell';
import { createRoot } from 'react-dom/client';
import { createElement, lazy, Suspense, type ComponentType } from 'react';
import 'ppds-kit/styles/site.css';

// Props come from the server as JSON; each island validates what it needs.
const ISLANDS: Record<string, ComponentType<never>> = {
  demo: lazy(() => import('./islands/DemoFrame.tsx')),
  scenario: lazy(() => import('./islands/ScenarioFrame.tsx')),
};

function mountIslands() {
  for (const element of document.querySelectorAll<HTMLElement>('[data-island]')) {
    const name = element.dataset['island'] ?? '';
    const Component = ISLANDS[name];
    if (!Component) continue;
    const props = JSON.parse(element.dataset['props'] ?? '{}') as never;
    createRoot(element).render(
      createElement(Suspense, { fallback: null }, createElement(Component, props)),
    );
  }
}

initShell();
mountIslands();
