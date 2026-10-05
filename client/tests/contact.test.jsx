import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import siteConfig from '@portfolio/shared/siteConfig.json';
import App from '../src/app/App.jsx';
import ThemeProvider from '../src/app/ThemeProvider.jsx';
import ContactForm from '../src/components/sections/ContactForm.jsx';
import { usePlaceholderProfile } from './helpers/profileConfig.js';

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'A project',
  message: 'I would like to talk about a project.',
};

async function fill(user, values = valid) {
  await user.type(screen.getByLabelText(/^Name/), values.name);
  await user.type(screen.getByLabelText(/^Email/), values.email);
  await user.type(screen.getByLabelText(/^Subject/), values.subject);
  await user.type(screen.getByLabelText(/^Message/), values.message);
}

function setup(send = vi.fn().mockResolvedValue({ ok: true })) {
  const user = userEvent.setup();
  const view = render(<ContactForm send={send} />);
  return { user, send, ...view };
}

const submit = () => screen.getByRole('button', { name: /^Send message|^Sending/ });

describe('ContactForm', () => {
  it('has a labelled control for each field and says which are required', () => {
    setup();

    for (const label of [/^Name/, /^Email/, /^Subject/, /^Message/]) {
      expect(screen.getByLabelText(label)).toBeRequired();
    }
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/^Name/)).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText(/^Message/)).toHaveAccessibleDescription(
      'Between 10 and 2000 characters.',
    );
    expect(screen.getByText(/are required/)).toBeInTheDocument();
  });

  it('shows nothing in its feedback areas until something happens', () => {
    setup();

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  describe('checking before sending', () => {
    it('lists every problem next to its field, sends nothing, and focuses the first one', async () => {
      const { user, send } = setup();

      await user.click(submit());

      expect(send).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/^Name/)).toHaveFocus();
      expect(screen.getByLabelText(/^Name/)).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText(/^Name/)).toHaveAccessibleDescription('Enter your name.');
      expect(screen.getByLabelText(/^Email/)).toHaveAccessibleDescription(
        'Enter your email address.',
      );
      expect(screen.getByLabelText(/^Subject/)).toHaveAccessibleDescription('Enter a subject.');
      expect(screen.getByLabelText(/^Message/)).toHaveAccessibleDescription(
        'Between 10 and 2000 characters. Enter your message.',
      );
    });

    it('focuses the first field that is wrong, not always the first field', async () => {
      const { user, send } = setup();
      await fill(user, { ...valid, email: 'not-an-email' });

      await user.click(submit());

      expect(send).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/^Email/)).toHaveFocus();
      expect(screen.getByLabelText(/^Email/)).toHaveAccessibleDescription(
        'Enter a valid email address, like name@example.com.',
      );
    });

    it('re-checks a flagged field while it is corrected and clears the message', async () => {
      const { user } = setup();
      await user.click(submit());
      expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');

      await user.type(screen.getByLabelText(/^Email/), 'ada@');
      expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText(/^Email/)).toHaveAccessibleDescription(
        'Enter a valid email address, like name@example.com.',
      );

      await user.type(screen.getByLabelText(/^Email/), 'example.com');
      expect(screen.getByLabelText(/^Email/)).not.toHaveAttribute('aria-invalid');
      expect(screen.getByLabelText(/^Email/)).not.toHaveAccessibleDescription();
      // Fields that were not touched keep their messages.
      expect(screen.getByLabelText(/^Name/)).toHaveAttribute('aria-invalid', 'true');
    });

    it('does not scold a field before the first attempt to send', async () => {
      const { user } = setup();

      await user.type(screen.getByLabelText(/^Email/), 'ada@');
      await user.tab();

      expect(screen.getByLabelText(/^Email/)).not.toHaveAttribute('aria-invalid');
      expect(screen.queryByText(/valid email/)).toBeNull();
    });
  });

  describe('sending', () => {
    it('sends trimmed values, announces success and empties the form', async () => {
      const { user, send } = setup();
      await fill(user, { ...valid, name: '  Ada Lovelace  ', email: ' ADA@Example.com ' });

      await user.click(submit());

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith({ ...valid, website: '' });
      expect(
        within(screen.getByRole('status')).getByText('Your message has been sent.'),
      ).toBeVisible();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByLabelText(/^Name/)).toHaveValue('');
      expect(screen.getByLabelText(/^Message/)).toHaveValue('');
      expect(submit()).toBeEnabled();
    });

    it('removes the success message once the visitor starts a new message', async () => {
      const { user } = setup();
      await fill(user);
      await user.click(submit());
      expect(screen.getByText('Your message has been sent.')).toBeInTheDocument();

      await user.type(screen.getByLabelText(/^Name/), 'A');

      expect(screen.queryByText('Your message has been sent.')).toBeNull();
    });

    it('shows a busy button and ignores a second click while sending', async () => {
      let finish;
      const send = vi.fn(() => new Promise((resolve) => (finish = resolve)));
      const { user } = setup(send);
      await fill(user);

      await user.click(submit());

      expect(submit()).toBeDisabled();
      expect(submit()).toHaveAttribute('aria-busy', 'true');
      expect(submit()).toHaveTextContent('Sending…');
      await user.keyboard('{Enter}');
      expect(send).toHaveBeenCalledTimes(1);

      finish({ ok: true });
      expect(await screen.findByText('Your message has been sent.')).toBeInTheDocument();
      expect(submit()).toBeEnabled();
      expect(submit()).toHaveTextContent('Send message');
    });

    it('can be submitted from the keyboard', async () => {
      const { user, send } = setup();
      await fill(user, { ...valid, message: 'Written with the keyboard only.' });

      await user.type(screen.getByLabelText(/^Subject/), '{Enter}');

      expect(send).toHaveBeenCalledTimes(1);
    });
  });

  describe('when sending fails', () => {
    it('announces the error, keeps what was typed and allows another try', async () => {
      const send = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, kind: 'error', message: 'Something went wrong.' })
        .mockResolvedValueOnce({ ok: true });
      const { user } = setup(send);
      await fill(user);

      await user.click(submit());

      expect(within(screen.getByRole('alert')).getByText('Something went wrong.')).toBeVisible();
      expect(screen.queryByText('Your message has been sent.')).toBeNull();
      expect(screen.getByLabelText(/^Name/)).toHaveValue(valid.name);
      expect(screen.getByLabelText(/^Message/)).toHaveValue(valid.message);
      expect(submit()).toBeEnabled();

      await user.click(submit());

      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByText('Your message has been sent.')).toBeInTheDocument();
    });

    it('shows the rate-limit message as it was given', async () => {
      const { user } = setup(
        vi.fn().mockResolvedValue({
          ok: false,
          kind: 'rate-limit',
          message: 'Too many messages. Please try again later.',
        }),
      );
      await fill(user);

      await user.click(submit());

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Too many messages. Please try again later.',
      );
    });

    it('puts the server’s field messages next to the fields and focuses the first', async () => {
      const { user } = setup(
        vi.fn().mockResolvedValue({
          ok: false,
          kind: 'validation',
          fieldErrors: { subject: 'Subject contains characters that are not allowed.' },
        }),
      );
      await fill(user);

      await user.click(submit());

      expect(screen.getByLabelText(/^Subject/)).toHaveFocus();
      expect(screen.getByLabelText(/^Subject/)).toHaveAccessibleDescription(
        'Subject contains characters that are not allowed.',
      );
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByLabelText(/^Name/)).toHaveValue(valid.name);
    });

    it('removes the error as soon as the visitor edits', async () => {
      const { user } = setup(
        vi.fn().mockResolvedValue({ ok: false, kind: 'error', message: 'Something went wrong.' }),
      );
      await fill(user);
      await user.click(submit());
      expect(screen.getByRole('alert')).toBeInTheDocument();

      await user.type(screen.getByLabelText(/^Name/), '!');

      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('spam trap', () => {
    function trap(container) {
      return container.querySelector('input[name="website"]');
    }

    it('is hidden from people: out of the tab order and from assistive technology', () => {
      const { container } = setup();

      expect(trap(container)).toHaveAttribute('tabindex', '-1');
      expect(trap(container)).toHaveAttribute('autocomplete', 'off');
      expect(trap(container).closest('[aria-hidden="true"]')).not.toBeNull();
      expect(screen.queryByRole('textbox', { name: /leave this field empty/i })).toBeNull();
    });

    it('is sent along untouched so the server can recognise a bot', async () => {
      const { user, send, container } = setup();
      await fill(user);
      await user.type(trap(container), 'https://spam.example');

      await user.click(submit());

      expect(send).toHaveBeenCalledWith({ ...valid, website: 'https://spam.example' });
    });

    it('is never reached by tabbing through the form', async () => {
      const { user, container } = setup();

      for (let i = 0; i < 7; i += 1) {
        await user.tab();
        expect(document.activeElement).not.toBe(trap(container));
      }
    });
  });
});

describe('contact page', () => {
  usePlaceholderProfile();

  function renderContact() {
    return render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/contact']}>
          <App />
        </MemoryRouter>
      </ThemeProvider>,
    );
  }

  it('is a real page with one h1, the form, and no longer a placeholder', () => {
    renderContact();
    const main = screen.getByRole('main');

    expect(within(main).getByRole('heading', { level: 1, name: 'Contact' })).toBeInTheDocument();
    expect(within(main).queryByText('Coming soon')).toBeNull();
    expect(
      within(screen.getByRole('region', { name: 'Send a message' })).getByLabelText(/^Message/),
    ).toBeInTheDocument();
    expect(document.title).toBe(`Contact | ${siteConfig.name}`);
  });

  it('keeps heading levels in order', () => {
    renderContact();
    const levels = within(screen.getByRole('main'))
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName[1]));

    expect(levels[0]).toBe(1);
    expect(levels.slice(1).every((level) => level === 2)).toBe(true);
  });

  it('shows no "other ways" while only placeholder links are configured', () => {
    renderContact();

    expect(screen.queryByRole('region', { name: 'Other ways to reach me' })).toBeNull();
  });

  it('lists real profile links as soon as they are configured', () => {
    siteConfig.email = 'hello@portfolio.dev';
    siteConfig.social = { github: 'https://github.com/someone', linkedin: 'LINKEDIN_URL' };
    renderContact();
    const region = screen.getByRole('region', { name: 'Other ways to reach me' });

    expect(within(region).getByRole('link', { name: /GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/someone',
    );
    expect(within(region).getByRole('link', { name: 'Email' })).toHaveAttribute(
      'href',
      'mailto:hello@portfolio.dev',
    );
    expect(within(region).queryByRole('link', { name: /LinkedIn/ })).toBeNull();
  });

  it('sends the message through the API and confirms it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 201, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const user = userEvent.setup();
      renderContact();
      await fill(user);

      await user.click(submit());

      expect(await screen.findByText('Your message has been sent.')).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe('/api/contact');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
