import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import Button from '../src/components/ui/Button.jsx';
import EmptyState from '../src/components/ui/EmptyState.jsx';
import ErrorState from '../src/components/ui/ErrorState.jsx';
import FormField from '../src/components/ui/FormField.jsx';
import Input from '../src/components/ui/Input.jsx';
import LinkButton from '../src/components/ui/LinkButton.jsx';
import Spinner from '../src/components/ui/Spinner.jsx';

describe('Button', () => {
  it('does not submit a surrounding form unless asked to', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={handleSubmit}>
        <Button>Plain</Button>
        <Button type="submit">Send</Button>
      </form>,
    );

    await user.click(screen.getByRole('button', { name: 'Plain' }));
    expect(handleSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(handleSubmit).toHaveBeenCalledOnce();
  });

  it('is disabled, marked busy and ignores clicks while loading', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button loading onClick={handleClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    await user.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe('LinkButton', () => {
  it('opens external links in a new tab safely and says so', () => {
    render(
      <LinkButton href="https://example.com/cv.pdf" newTab>
        Download CV
      </LinkButton>,
    );

    const link = screen.getByRole('link', { name: 'Download CV (opens in a new tab)' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('links to internal pages without a full page load', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/projects">View My Projects</LinkButton>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'View My Projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
  });
});

describe('FormField', () => {
  it('connects label, hint and error to the control', () => {
    render(
      <FormField
        label="Email"
        hint="We only use it to reply."
        error="Enter a valid email."
        required
      >
        {(controlProps) => <Input type="email" {...controlProps} />}
      </FormField>,
    );

    const input = screen.getByRole('textbox', { name: 'Email' });

    expect(input).toBeRequired();
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('We only use it to reply. Enter a valid email.');
  });

  it('marks nothing invalid when there is no error', () => {
    render(<FormField label="Name">{(controlProps) => <Input {...controlProps} />}</FormField>);

    const input = screen.getByRole('textbox', { name: 'Name' });

    expect(input).toBeValid();
    expect(input).not.toHaveAccessibleDescription();
  });
});

describe('ErrorState', () => {
  it('announces the problem and offers a retry', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();
    render(<ErrorState onRetry={handleRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(handleRetry).toHaveBeenCalledOnce();
  });

  it('shows no retry button when there is nothing to retry', () => {
    render(<ErrorState />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('uses the heading level the page asks for', () => {
    render(<EmptyState title="No projects yet" headingAs="h3" />);

    expect(screen.getByRole('heading', { level: 3, name: 'No projects yet' })).toBeInTheDocument();
  });
});

describe('Spinner', () => {
  it('announces its label', () => {
    render(<Spinner label="Loading projects" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading projects');
  });

  it('stays silent when told the surrounding control already reports busy', () => {
    render(<Spinner label={null} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
