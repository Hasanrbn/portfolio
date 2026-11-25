import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import siteConfig from '@portfolio/shared/siteConfig.json';
import aboutData from '@portfolio/shared/data/about.json';
import TextSection from '../src/components/sections/TextSection.jsx';
import { getSection, renderSite } from './helpers/renderSite.jsx';

const renderAbout = () => renderSite('/');

describe('about section', () => {
  it('has a heading of its own and introduces the person', () => {
    renderAbout();
    const about = getSection('About me');

    expect(within(about).getByRole('heading', { level: 2, name: 'About me' })).toBeInTheDocument();
    expect(about).toHaveTextContent(siteConfig.intro);
    expect(about).toHaveTextContent(`${siteConfig.role} · ${siteConfig.location}`);
  });

  it('lists the personal highlights from the data file', () => {
    renderAbout();
    const highlights = within(getSection('About me')).getByRole('region', {
      name: 'Personal highlights',
    });

    expect(
      within(highlights)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(aboutData.highlights);
  });

  it('shows each written section under its own heading', () => {
    renderAbout();

    for (const section of aboutData.sections) {
      const region = within(getSection('About me')).getByRole('region', { name: section.title });
      section.items.forEach((item) => expect(region).toHaveTextContent(item));
    }
  });

  it('keeps heading levels in order', () => {
    renderAbout();
    const levels = within(getSection('About me'))
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName[1]));

    expect(levels[0]).toBe(2);
    expect(levels.slice(1).every((level) => level === 3)).toBe(true);
  });

  it('shows the profile picture only when one is set in the site config', () => {
    renderAbout();
    const pictures = within(getSection('About me')).queryAllByRole('img');

    if (siteConfig.avatar) {
      expect(pictures).toHaveLength(1);
      expect(pictures[0]).toHaveAttribute('alt', siteConfig.name);
      expect(pictures[0]).toHaveAttribute('src', siteConfig.avatar);
    } else {
      expect(pictures).toHaveLength(0);
    }
  });
});

describe('TextSection', () => {
  it('shows paragraphs and bullet points', () => {
    render(
      <TextSection title="Approach" paragraphs={['I write tests.']} items={['Small steps']} />,
    );

    expect(screen.getByRole('heading', { name: 'Approach' })).toBeInTheDocument();
    expect(screen.getByText('I write tests.')).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('Small steps');
  });

  it('renders nothing when there is no content to show', () => {
    const { container } = render(
      <TextSection title="Career goals" paragraphs={['', '  ']} items={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
