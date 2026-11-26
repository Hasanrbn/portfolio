// Build-time SEO files for the production site: robots.txt, sitemap.xml and the social-sharing
// tags in index.html. Everything here needs the public address of the site, which comes from
// SITE_URL (the same variable the server uses). While SITE_URL is missing or is not an https
// address, no sitemap and no address-based tags are produced: a wrong address is worse than none.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Public paths. The site is a single page (the menu scrolls to sections), so the home page is
 * the only address worth listing. Old page addresses redirect to it.
 */
export const STATIC_PATHS = ['/'];

/** The site's origin ("https://example.com") from SITE_URL, or null when it cannot be trusted. */
export function normalizeSiteUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * The site's address from the build environment: SITE_URL when set, otherwise the domain Vercel
 * announces to every build (VERCEL_PROJECT_PRODUCTION_URL, written without "https://").
 */
export function siteUrlFromEnv(env) {
  if (env.SITE_URL) {
    return env.SITE_URL;
  }
  return env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '';
}

const escapeXml = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export function buildSitemap(siteUrl, paths) {
  const entries = paths
    .map((path) => `  <url><loc>${escapeXml(siteUrl + (path === '/' ? '/' : path))}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export function buildRobots(siteUrl) {
  const lines = ['User-agent: *', 'Allow: /'];
  if (siteUrl) {
    lines.push('', `Sitemap: ${siteUrl}/sitemap.xml`);
  }
  return `${lines.join('\n')}\n`;
}

/** JSON can sit inside a <script> tag safely only when "<" cannot close the tag early. */
const safeJson = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');

/** Where the link-preview picture lives in client/public. */
export const OG_IMAGE_PATH = '/og-image.jpg';

/** Tags that need the site address: the page address and picture for link previews, and the person. */
export function buildHeadTags(siteUrl, siteConfig) {
  const tags = [`<meta property="og:url" content="${escapeXml(`${siteUrl}/`)}" />`];

  // The link-preview picture is a designed card (scripts/og-image.html), not the avatar.
  const image = escapeXml(siteUrl + OG_IMAGE_PATH);
  tags.push(
    `<meta property="og:image" content="${image}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${escapeXml(`${siteConfig.name} | ${siteConfig.role}`)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
  );

  // Only facts that are already public on the site; no email address or phone number.
  const sameAs = Object.values(siteConfig.social ?? {}).filter((link) =>
    link.startsWith('https://'),
  );
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: siteConfig.name,
    jobTitle: siteConfig.role,
    url: `${siteUrl}/`,
    ...(siteConfig.avatar?.startsWith('/') && { image: siteUrl + siteConfig.avatar }),
    ...(sameAs.length > 0 && { sameAs }),
  };
  tags.push(`<script type="application/ld+json">${safeJson(person)}</script>`);

  return tags.map((tag) => `    ${tag}`).join('\n');
}

/** Vite plugin: adds the tags to index.html and writes robots.txt and sitemap.xml into dist. */
export function seoPlugin({ siteUrl, sharedDir }) {
  const base = normalizeSiteUrl(siteUrl);
  const siteConfig = JSON.parse(readFileSync(join(sharedDir, 'siteConfig.json'), 'utf8'));

  return {
    name: 'portfolio-seo',
    apply: 'build',
    transformIndexHtml(html) {
      return base ? html.replace('</head>', `${buildHeadTags(base, siteConfig)}\n  </head>`) : html;
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buildRobots(base) });
      if (!base) {
        this.warn(
          'SITE_URL is not an https address, so sitemap.xml and the link-preview tags were skipped. Set SITE_URL to the public address before the production build.',
        );
        return;
      }
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: buildSitemap(base, STATIC_PATHS),
      });
    },
  };
}
