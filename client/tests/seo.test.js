// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import siteConfig from '@portfolio/shared/siteConfig.json';
import { NAV_ITEMS } from '../src/app/siteNavigation.js';
import { PAGE_DESCRIPTIONS } from '../src/utils/pageDescriptions.js';
import {
  STATIC_PATHS,
  buildHeadTags,
  buildRobots,
  buildSitemap,
  normalizeSiteUrl,
  seoPlugin,
  siteUrlFromEnv,
} from '../seo.js';

const SHARED_DIR = fileURLToPath(new URL('../../shared', import.meta.url));
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

describe('normalizeSiteUrl', () => {
  it('keeps only the origin of an https address', () => {
    expect(normalizeSiteUrl('https://example.com/')).toBe('https://example.com');
    expect(normalizeSiteUrl('https://example.com/some/path?x=1')).toBe('https://example.com');
    expect(normalizeSiteUrl(' https://me.pages.dev ')).toBe('https://me.pages.dev');
  });

  it('rejects anything that is not a usable public https address', () => {
    for (const value of ['', undefined, null, 'example.com', 'http://example.com', 'nonsense']) {
      expect(normalizeSiteUrl(value)).toBeNull();
    }
  });
});

describe('siteUrlFromEnv', () => {
  it('prefers SITE_URL', () => {
    expect(
      siteUrlFromEnv({
        SITE_URL: 'https://mine.dev',
        VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app',
      }),
    ).toBe('https://mine.dev');
  });

  it('falls back to the domain Vercel announces, adding https://', () => {
    expect(siteUrlFromEnv({ VERCEL_PROJECT_PRODUCTION_URL: 'my-site.vercel.app' })).toBe(
      'https://my-site.vercel.app',
    );
  });

  it('is empty when neither is known', () => {
    expect(siteUrlFromEnv({})).toBe('');
  });
});

describe('sitemap paths', () => {
  it('lists only the home page: the site is one page and old addresses redirect to it', () => {
    expect(STATIC_PATHS).toEqual(['/']);
  });

  it('has a section for every navigation item behind that one address', () => {
    expect(NAV_ITEMS.every((item) => item.to.startsWith('/#'))).toBe(true);
  });
});

describe('sitemap.xml and robots.txt', () => {
  it('lists every path with the full address, escaped', () => {
    const xml = buildSitemap('https://example.com', ['/', '/about', '/a&b']);

    expect(xml).toContain('<loc>https://example.com/</loc>');
    expect(xml).toContain('<loc>https://example.com/about</loc>');
    expect(xml).toContain('<loc>https://example.com/a&amp;b</loc>');
  });

  it('allows crawling and points to the sitemap only when the address is known', () => {
    expect(buildRobots('https://example.com')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n',
    );
    expect(buildRobots(null)).toBe('User-agent: *\nAllow: /\n');
  });
});

describe('head tags for link previews and search engines', () => {
  const tags = buildHeadTags('https://example.com', siteConfig);

  it('points the preview at the site and the profile picture with absolute addresses', () => {
    expect(tags).toContain('og:url" content="https://example.com/"');
    if (siteConfig.avatar) {
      expect(tags).toContain(`og:image" content="https://example.com${siteConfig.avatar}"`);
    }
  });

  it('describes the person with public facts only', () => {
    const json = JSON.parse(tags.match(/<script type="application\/ld\+json">(.*)<\/script>/)[1]);

    expect(json).toMatchObject({
      '@type': 'Person',
      name: siteConfig.name,
      jobTitle: siteConfig.role,
      url: 'https://example.com/',
    });
    expect(JSON.stringify(json)).not.toContain(siteConfig.email);
    expect(json.sameAs).toEqual(Object.values(siteConfig.social));
  });

  it('cannot be broken out of the script tag', () => {
    const nasty = buildHeadTags('https://example.com', { ...siteConfig, name: '</script><b>' });

    expect(nasty.match(/<\/script>/g)).toHaveLength(1);
  });
});

describe('seoPlugin', () => {
  const emitted = (siteUrl) => {
    const emitFile = vi.fn();
    const warn = vi.fn();
    const plugin = seoPlugin({ siteUrl, sharedDir: SHARED_DIR });
    plugin.generateBundle.call({ emitFile, warn });
    return {
      plugin,
      files: Object.fromEntries(emitFile.mock.calls.map(([f]) => [f.fileName, f.source])),
      warn,
    };
  };

  it('writes robots.txt, sitemap.xml and the tags when SITE_URL is an https address', () => {
    const { plugin, files, warn } = emitted('https://example.com');

    expect(Object.keys(files).sort()).toEqual(['robots.txt', 'sitemap.xml']);
    expect(files['sitemap.xml']).toContain('<loc>https://example.com/</loc>');
    expect(files['sitemap.xml']).not.toContain('/projects/');
    expect(plugin.transformIndexHtml(indexHtml)).toContain('og:url');
    expect(warn).not.toHaveBeenCalled();
  });

  it('writes only a plain robots.txt, warns and leaves index.html alone without one', () => {
    const { plugin, files, warn } = emitted('http://localhost:5173');

    expect(Object.keys(files)).toEqual(['robots.txt']);
    expect(files['robots.txt']).not.toContain('Sitemap');
    expect(plugin.transformIndexHtml(indexHtml)).toBe(indexHtml);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('static head of index.html', () => {
  it('matches the site settings and has no description that would clash with the pages', () => {
    expect(indexHtml).toContain(`<title>${siteConfig.name} | ${siteConfig.role}</title>`);
    expect(indexHtml).toContain(`property="og:site_name" content="${siteConfig.name}"`);
    expect(indexHtml).toContain(
      `property="og:title" content="${siteConfig.name} | ${siteConfig.role}"`,
    );
    expect(indexHtml).not.toMatch(/<meta\s+name="description"/);
  });
});

describe('page descriptions', () => {
  it('has a readable home description', () => {
    expect(PAGE_DESCRIPTIONS.home.length).toBeGreaterThan(20);
    expect(PAGE_DESCRIPTIONS.home.length).toBeLessThanOrEqual(160);
  });
});
