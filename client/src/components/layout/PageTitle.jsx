import siteConfig from '@portfolio/shared/siteConfig.json';

/**
 * Sets what the browser tab, search results and history show for the current page. React hoists
 * <title> and <meta> into <head> and removes them again when the page changes, so every page
 * should render one of these. Pages that must not appear in search results (a missing page,
 * for example) pass noIndex.
 */
export default function PageTitle({ title, description, noIndex = false }) {
  const fullTitle = title
    ? `${title} | ${siteConfig.name}`
    : `${siteConfig.name} | ${siteConfig.role}`;

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {noIndex && <meta name="robots" content="noindex" />}
    </>
  );
}
