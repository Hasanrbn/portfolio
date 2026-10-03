// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DARK_QUERY, THEME_STORAGE_KEY } from '../src/utils/theme.js';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// The inline script in index.html cannot import from utils/theme.js (it must run before
// any module loads), so this guards against the two copies drifting apart.
describe('index.html anti-flash theme script', () => {
  it('reads the same storage key as the app', () => {
    expect(indexHtml).toContain(`localStorage.getItem('${THEME_STORAGE_KEY}')`);
  });

  it('uses the same dark-mode media query as the app', () => {
    expect(indexHtml).toContain(`matchMedia('${DARK_QUERY}')`);
  });

  it('sets data-theme before the app bundle loads', () => {
    const scriptPosition = indexHtml.indexOf('document.documentElement.dataset.theme');
    const bundlePosition = indexHtml.indexOf('src="/src/main.jsx"');

    expect(scriptPosition).toBeGreaterThan(-1);
    expect(scriptPosition).toBeLessThan(bundlePosition);
  });
});
