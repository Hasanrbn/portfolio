import siteConfig from '@portfolio/shared/siteConfig.json';

/**
 * Sets the browser tab title (React hoists <title> into <head>). Every page should render one,
 * so the tab and history entry always describe the page being shown. Detailed per-page SEO
 * metadata is added on the server in Phase 17.
 */
export default function PageTitle({ title }) {
  const fullTitle = title
    ? `${title} | ${siteConfig.name}`
    : `${siteConfig.name} | ${siteConfig.role}`;

  return <title>{fullTitle}</title>;
}
