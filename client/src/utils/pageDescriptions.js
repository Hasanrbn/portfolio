import siteConfig from '@portfolio/shared/siteConfig.json';

const { name, role, location } = siteConfig;

/**
 * What search results show under each page's title. Written from the site's own settings, so it
 * never claims more than the site says elsewhere.
 */
export const PAGE_DESCRIPTIONS = {
  home: `Portfolio of ${name}, a ${role} based in ${location}: projects, skills, experience and contact details.`,
};
