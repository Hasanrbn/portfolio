/**
 * The sections of the one-page site, in the order they appear. `id` is the id of the section
 * element and `to` is the address that scrolls to it. The header and the footer show these.
 */
export const NAV_ITEMS = [
  { label: 'Home', id: 'home', to: '/#home' },
  { label: 'About', id: 'about', to: '/#about' },
  { label: 'Skills', id: 'skills', to: '/#skills' },
  { label: 'Projects', id: 'projects', to: '/#projects' },
  { label: 'Experience', id: 'experience', to: '/#experience' },
  { label: 'Education', id: 'education', to: '/#education' },
  { label: 'Certificates', id: 'certificates', to: '/#certificates' },
  { label: 'Contact', id: 'contact', to: '/#contact' },
];

/** The sections to show in the header and the footer. */
export function getNavItems() {
  return NAV_ITEMS;
}
