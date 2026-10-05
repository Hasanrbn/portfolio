import { afterEach, beforeEach } from 'vitest';
import siteConfig from '@portfolio/shared/siteConfig.json';

// What shared/siteConfig.json holds before the owner fills in the real details.
const PLACEHOLDER_PROFILE = {
  email: 'email@example.com',
  social: { github: 'GITHUB_URL', linkedin: 'LINKEDIN_URL' },
  resumeUrl: 'CV_URL',
  avatar: '',
  availability: '',
};

/**
 * For tests about what the site does while the profile is still unfilled: gives every test in
 * the surrounding `describe` the placeholder profile and puts the real one back afterwards.
 * Without it those tests would start failing the day the real GitHub address is entered.
 */
export function usePlaceholderProfile() {
  let saved;

  beforeEach(() => {
    saved = structuredClone(siteConfig);
    Object.assign(siteConfig, structuredClone(PLACEHOLDER_PROFILE));
  });

  afterEach(() => {
    Object.assign(siteConfig, saved);
  });
}
