// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './helpers/contrast.js';

const tokensCss = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

function readCustomProperties(blockStart) {
  const start = tokensCss.indexOf(blockStart);
  if (start === -1) {
    throw new Error(`Block not found in tokens.css: ${blockStart}`);
  }
  const end = tokensCss.indexOf('\n}', start);
  const block = tokensCss.slice(start, end);
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  );
}

const light = readCustomProperties(':root {');
const dark = { ...light, ...readCustomProperties(":root[data-theme='dark'] {") };

const TEXT_MINIMUM = 4.5;
const UI_MINIMUM = 3;

const surfaces = ['--color-bg', '--color-surface', '--color-surface-subtle'];

const textPairs = [
  ...surfaces.flatMap((surface) => [
    ['--color-text', surface],
    ['--color-text-muted', surface],
    ['--color-accent-text', surface],
    ['--color-success-text', surface],
    ['--color-warning-text', surface],
    ['--color-danger-text', surface],
  ]),
  ['--color-on-accent', '--color-accent'],
  ['--color-on-accent', '--color-accent-hover'],
  ['--color-accent-text', '--color-accent-subtle'],
  ['--color-success-text', '--color-success-subtle'],
  ['--color-warning-text', '--color-warning-subtle'],
  ['--color-danger-text', '--color-danger-subtle'],
];

const uiPairs = [
  ['--color-focus', '--color-bg'],
  ['--color-focus', '--color-surface'],
  ['--color-input-border', '--color-bg'],
  ['--color-input-border', '--color-surface'],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme contrast', (_themeName, tokens) => {
  it.each(textPairs)('text %s on %s meets 4.5:1', (foreground, background) => {
    expect(contrastRatio(tokens[foreground], tokens[background])).toBeGreaterThanOrEqual(
      TEXT_MINIMUM,
    );
  });

  it.each(uiPairs)('component colour %s against %s meets 3:1', (foreground, background) => {
    expect(contrastRatio(tokens[foreground], tokens[background])).toBeGreaterThanOrEqual(
      UI_MINIMUM,
    );
  });
});
