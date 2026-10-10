import siteConfig from '@portfolio/shared/siteConfig.json';

const { name, role, location } = siteConfig;

/**
 * What search results show under each page's title. Written from the site's own settings, so it
 * never claims more than the site says elsewhere. Project and article pages use their own text.
 */
export const PAGE_DESCRIPTIONS = {
  home: `Portfolio of ${name}, a ${role} based in ${location}: projects, skills, experience and contact details.`,
  about: `About ${name}: who they are, what they are interested in and what they focus on as a developer.`,
  skills: `The technologies and tools ${name} works with, grouped by area.`,
  projects: `Projects built by ${name}, with what each one does and how it is built.`,
  experience: `Organisation and work experience of ${name}.`,
  education: `Where ${name} has studied.`,
  certificates: `Courses and certificates completed by ${name}.`,
  blog: `Articles written by ${name}.`,
  contact: `Get in touch with ${name} by sending a message.`,
};
