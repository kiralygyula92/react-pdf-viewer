/**
 * Mounts the demo islands where the server left a placeholder. Loaded only by pages that have
 * one, so pages without a live demo never download React.
 */
import { createRoot } from 'react-dom/client';
import { createElement, lazy, Suspense, type ComponentType } from 'react';

// Props come from the server as JSON; each island validates what it needs.
const ISLANDS: Record<string, ComponentType<never>> = {
  demo: lazy(() => import('./DemoFrame.tsx')),
  scenario: lazy(() => import('./ScenarioFrame.tsx')),
};

export function mountIslands(elements: Iterable<HTMLElement>) {
  for (const element of elements) {
    const Component = ISLANDS[element.dataset['island'] ?? ''];
    if (!Component) continue;
    const props = JSON.parse(element.dataset['props'] ?? '{}') as never;
    createRoot(element).render(
      createElement(Suspense, { fallback: null }, createElement(Component, props)),
    );
  }
}
