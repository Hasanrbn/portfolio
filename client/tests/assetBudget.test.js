// @vitest-environment node
import { readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Page weight is a feature: the site has to load quickly on a slow phone. These budgets fail the
 * build when an image is added in a heavy format or at a heavy size, long before a visitor
 * notices. If one fails, compress or resize the image (WebP at a width no larger than it is shown
 * at, twice over for sharp screens) rather than raising the budget.
 */
const PUBLIC = fileURLToPath(new URL('../public', import.meta.url));
const SRC = fileURLToPath(new URL('../src', import.meta.url));
const KB = 1024;

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  });
}

const IMAGES = filesIn(PUBLIC).filter((file) => /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(file));
const label = (file) => relative(PUBLIC, file);

describe('image budget', () => {
  it('finds the images it is meant to check', () => {
    expect(IMAGES.length).toBeGreaterThan(10);
  });

  it('uses compact formats: WebP for pictures, JPEG for the preview card, SVG for icons', () => {
    const heavy = IMAGES.filter((file) => /\.(png|gif)$/i.test(file)).map(label);
    expect(heavy).toEqual([]);
  });

  it.each(IMAGES.map((file) => [label(file), file]))('keeps %s small', (name, file) => {
    expect(statSync(file).size).toBeLessThanOrEqual(250 * KB);
  });

  it('keeps the portrait poses light, since they sit beside the first screen', () => {
    for (const file of IMAGES.filter((f) => label(f).startsWith('images/profile/'))) {
      expect(statSync(file).size, label(file)).toBeLessThanOrEqual(90 * KB);
    }
  });

  it('keeps all the pictures together under a total budget', () => {
    const total = IMAGES.reduce((sum, file) => sum + statSync(file).size, 0);
    expect(total).toBeLessThanOrEqual(1400 * KB);
  });
});

describe('font budget', () => {
  it('ships the script font as a small subset, not the full variable font', () => {
    const fonts = filesIn(join(SRC, 'assets', 'fonts'));
    expect(fonts.length).toBeGreaterThan(0);
    for (const font of fonts) {
      expect(extname(font)).toBe('.woff2');
      expect(statSync(font).size).toBeLessThanOrEqual(20 * KB);
    }
  });
});
