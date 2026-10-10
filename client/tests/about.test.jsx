import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import siteConfig from '@portfolio/shared/siteConfig.json';
import aboutData from '@portfolio/shared/data/about.json';
import App from '../src/app/App.jsx';
import ThemeProvider from '../src/app/ThemeProvider.jsx';
import TextSection from '../src/components/sections/TextSection.jsx';

function renderAbout() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/about']}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('about page', () => {
  it('has one h1 and introduces the person', () => {
    renderAbout();
    const main = screen.getByRole('main');

    expect(within(main).getByRole('heading', { level: 1, name: 'About me' })).toBeInTheDocument();
    expect(main).toHaveTextContent(siteConfig.intro);
    expect(main).toHaveTextContent(`${siteConfig.role} · ${siteConfig.location}`);
  });

  it('lists the personal highlights from the data file', () => {
    renderAbout();
    const section = screen.getByRole('region', { name: 'Personal highlights' });

    expect(
      within(section)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(aboutData.highlights);
  });

  it('shows each written section under its own heading', () => {
    renderAbout();

    for (const section of aboutData.sections) {
      const region = screen.getByRole('region', { name: section.title });
      section.items.forEach((item) => expect(region).toHaveTextContent(item));
    }
  });

  it('keeps heading levels in order', () => {
    renderAbout();
    const levels = within(screen.getByRole('main'))
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName[1]));

    expect(levels[0]).toBe(1);
    expect(levels.slice(1).every((level) => level === 2)).toBe(true);
  });

  it('shows the profile picture only when one is set in the site config', () => {
    renderAbout();
    const pictures = within(screen.getByRole('main')).queryAllByRole('img');

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
