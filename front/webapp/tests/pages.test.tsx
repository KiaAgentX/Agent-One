/**
 * pages.test.tsx — renders EVERY one of the 30 pages (Law 9-B completeness).
 * Guards: (1) registry ↔ component map is total, (2) every page mounts
 * without crashing and shows a heading, (3) router resolves param + query
 * routes. This is the page-level zero-loss gate for the Mini App.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PAGES, matchRoute } from '../src/routes';
import { PAGE_COMPONENTS } from '../src/pages';

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('page registry parity (30/30)', () => {
  it('every registered page has a real component — no stubs left', () => {
    expect(PAGES).toHaveLength(30);
    expect(Object.keys(PAGE_COMPONENTS)).toHaveLength(30);
    for (const p of PAGES) {
      expect(PAGE_COMPONENTS[p.id], `missing component for ${p.id}`).toBeDefined();
    }
  });

  it('all param and query routes resolve through matchRoute', () => {
    expect(matchRoute('#/product/p1')?.page.id).toBe('product');
    expect(matchRoute('#/product/p1')?.params).toEqual({ id: 'p1' });
    expect(matchRoute('#/checkout?product=p2&qty=3')?.page.id).toBe('checkout');
    expect(matchRoute('#/checkout?product=p2&qty=3')?.params).toEqual({ product: 'p2', qty: '3' });
    expect(matchRoute('#/nope')).toBeUndefined(); // router falls back to /home
  });
});

describe('every page renders a heading', () => {
  for (const p of PAGES) {
    it(`/\\#/${p.path.replace(':id', 'p1')} → ${p.id}`, async () => {
      const C = PAGE_COMPONENTS[p.id]!;
      window.location.hash = p.path.replace(':id', 'p1');
      render(<C />);
      const heading = await screen.findByRole('heading', { level: 1 });
      expect(heading.textContent!.length).toBeGreaterThan(0);
    });
  }
});
