import { hasPublishedPosts } from '../services/postsService.js';

/** Every page of the site, in display order. The header and the footer show the ones from getNavItems(). */
export const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Skills', to: '/skills' },
  { label: 'Projects', to: '/projects' },
  { label: 'Experience', to: '/experience' },
  { label: 'Education', to: '/education' },
  { label: 'Certificates', to: '/certificates' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contact', to: '/contact' },
];

/**
 * The pages to show in the header and the footer. The Blog link appears only once there is an
 * article to read; the /blog address itself keeps working either way.
 */
export function getNavItems() {
  const blogReady = hasPublishedPosts();
  return NAV_ITEMS.filter((item) => item.to !== '/blog' || blogReady);
}
