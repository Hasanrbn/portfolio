/** Every page of the site, in display order. The header and the footer show the ones from getNavItems(). */
export const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Skills', to: '/skills' },
  { label: 'Projects', to: '/projects' },
  { label: 'Experience', to: '/experience' },
  { label: 'Education', to: '/education' },
  { label: 'Certificates', to: '/certificates' },
  { label: 'Contact', to: '/contact' },
];

/** The pages to show in the header and the footer. */
export function getNavItems() {
  return NAV_ITEMS;
}
