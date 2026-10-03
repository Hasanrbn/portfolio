import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SocialLinks from '../src/components/sections/SocialLinks.jsx';
import { getSocialLinks } from '../src/utils/socialLinks.js';

describe('getSocialLinks', () => {
  it('skips placeholder values so no broken link is shown', () => {
    const links = getSocialLinks({
      email: 'email@example.com',
      social: { github: 'GITHUB_URL', linkedin: 'LINKEDIN_URL' },
    });

    expect(links).toEqual([]);
  });

  it('returns real profiles and email in a fixed order', () => {
    const links = getSocialLinks({
      email: 'hasan@university.ac.id',
      social: {
        github: 'https://github.com/someone',
        linkedin: 'https://www.linkedin.com/in/someone',
      },
    });

    expect(links.map((link) => link.id)).toEqual(['github', 'linkedin', 'email']);
    expect(links[2].href).toBe('mailto:hasan@university.ac.id');
  });

  it('only accepts https addresses, which also rules out script links', () => {
    const links = getSocialLinks({
      email: 'not-an-email',
      social: { github: 'javascript:alert(1)', linkedin: 'http://linkedin.com/in/someone' },
    });

    expect(links).toEqual([]);
  });

  it('copes with a config that has no social section', () => {
    expect(getSocialLinks({})).toEqual([]);
  });
});

describe('SocialLinks', () => {
  it('opens profiles in a new tab safely and says so', () => {
    render(
      <SocialLinks
        links={[
          { id: 'github', label: 'GitHub', href: 'https://github.com/someone', icon: 'github' },
        ]}
      />,
    );

    const link = screen.getByRole('link', { name: 'GitHub (opens in a new tab)' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders nothing when there are no links', () => {
    const { container } = render(<SocialLinks links={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
