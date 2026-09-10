// @vitest-environment node
import { describe, expect, it } from 'vitest';

describe('SSR safety', () => {
  it('imports the entry points in Node without touching browser globals', async () => {
    expect(typeof window).toBe('undefined');
    await expect(import('../src/index')).resolves.toBeDefined();
    await expect(import('../src/compat')).resolves.toBeDefined();
  });
});
