import { useState } from 'react';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import FormField from '../../components/ui/FormField.jsx';
import Input from '../../components/ui/Input.jsx';
import LinkButton from '../../components/ui/LinkButton.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Tag from '../../components/ui/Tag.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import styles from './DesignPage.module.css';

const COLOR_GROUPS = [
  {
    title: 'Surfaces and text',
    tokens: [
      '--color-bg',
      '--color-surface',
      '--color-surface-subtle',
      '--color-border',
      '--color-input-border',
      '--color-text',
      '--color-text-muted',
    ],
  },
  {
    title: 'Accent',
    tokens: [
      '--color-accent',
      '--color-accent-hover',
      '--color-on-accent',
      '--color-accent-subtle',
      '--color-accent-text',
      '--color-focus',
    ],
  },
  {
    title: 'Status',
    tokens: [
      '--color-success-text',
      '--color-success-subtle',
      '--color-warning-text',
      '--color-warning-subtle',
      '--color-danger-text',
      '--color-danger-subtle',
    ],
  },
];

const TEXT_SIZES = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
const SPACING_STEPS = [1, 2, 3, 4, 6, 8, 12, 16, 24];

// Development-only page (not included in production builds). It exists to review every token
// and component in both themes while the design system is built.
export default function DesignPage() {
  const [saving, setSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  function simulateSave() {
    setSaving(true);
    setTimeout(() => setSaving(false), 1500);
  }

  return (
    <>
      <header className={styles.header}>
        <h1>Design system</h1>
        <p className={styles.lead}>
          Tokens and components used across the site. This page only exists in development.
        </p>
        <ThemeToggle />
      </header>

      <section className={styles.section} aria-labelledby="colors-heading">
        <h2 id="colors-heading">Colors</h2>
        {COLOR_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className={styles.subhead}>{group.title}</h3>
            <ul className={styles.swatches}>
              {group.tokens.map((token) => (
                <li key={token} className={styles.swatch}>
                  <span
                    className={styles.chip}
                    style={{ background: `var(${token})` }}
                    aria-hidden="true"
                  />
                  <code>{token}</code>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="type-heading">
        <h2 id="type-heading">Typography</h2>
        <ul className={styles.scaleList}>
          {TEXT_SIZES.map((size) => (
            <li key={size} className={styles.scaleItem}>
              <span className={styles.scaleName}>--text-{size}</span>
              <span style={{ fontSize: `var(--text-${size})`, lineHeight: 'var(--leading-tight)' }}>
                Build it correctly
              </span>
            </li>
          ))}
        </ul>
        <p>
          Body text uses Inter at the base size with a comfortable line height. Inline code looks
          like <code>npm run dev</code>, and links look <a href="#type-heading">like this</a>.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="spacing-heading">
        <h2 id="spacing-heading">Spacing</h2>
        <ul className={styles.scaleList}>
          {SPACING_STEPS.map((step) => (
            <li key={step} className={styles.scaleItem}>
              <span className={styles.scaleName}>--space-{step}</span>
              <span className={styles.bar} style={{ width: `var(--space-${step})` }} />
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="buttons-heading">
        <h2 id="buttons-heading">Buttons and links</h2>
        <div className={styles.row}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button loading={saving} onClick={simulateSave}>
            {saving ? 'Saving' : 'Click to load'}
          </Button>
        </div>
        <div className={styles.row}>
          <Button size="lg">Large primary</Button>
          <LinkButton to="/" variant="secondary" size="lg">
            Internal link
          </LinkButton>
          <LinkButton href="https://example.com" newTab variant="ghost" size="lg">
            External link
          </LinkButton>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="labels-heading">
        <h2 id="labels-heading">Badges and tags</h2>
        <div className={styles.row}>
          <Badge>Neutral</Badge>
          <Badge tone="accent">In progress</Badge>
          <Badge tone="success">Completed</Badge>
          <Badge tone="warning">Planned</Badge>
          <Badge tone="danger">Archived</Badge>
        </div>
        <div className={styles.row}>
          <Tag>React</Tag>
          <Tag>Node.js</Tag>
          <Tag>PostgreSQL</Tag>
          <Tag>Docker</Tag>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="cards-heading">
        <h2 id="cards-heading">Cards</h2>
        <div className={styles.grid2}>
          <Card as="article">
            <h3 className={styles.subhead}>Static card</h3>
            <p>Groups related content on a surface with a border and a soft shadow.</p>
          </Card>
          <Card as="article" interactive>
            <h3 className={styles.subhead}>Interactive card</h3>
            <p>Gains a stronger border and shadow on hover.</p>
            <p>
              <a href="#cards-heading">A real link inside</a>
            </p>
          </Card>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="forms-heading">
        <h2 id="forms-heading">Form fields</h2>
        <div className={styles.stack}>
          <FormField label="Name" hint="As you would like to be addressed." required>
            {(controlProps) => <Input name="name" autoComplete="name" {...controlProps} />}
          </FormField>
          <FormField label="Email" error="Enter a valid email address." required>
            {(controlProps) => (
              <Input
                type="email"
                name="email"
                autoComplete="email"
                defaultValue="not-an-email"
                {...controlProps}
              />
            )}
          </FormField>
          <FormField label="Message">
            {(controlProps) => <Textarea name="message" {...controlProps} />}
          </FormField>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="states-heading">
        <h2 id="states-heading">Loading, empty and error states</h2>
        <div className={styles.row}>
          <Spinner size="sm" label="Loading small" />
          <Spinner label="Loading medium" />
          <Spinner size="lg" label="Loading large" />
        </div>
        <Card aria-busy="true">
          <Skeleton width="40%" height="1.5rem" />
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Skeleton lines={3} />
          </div>
        </Card>
        <EmptyState
          headingAs="h3"
          title="No projects yet"
          description="Projects will appear here once they are added."
          action={<LinkButton to="/">Back to Home</LinkButton>}
        />
        <ErrorState
          headingAs="h3"
          onRetry={() => setRetryCount((count) => count + 1)}
          description={
            retryCount === 0
              ? 'Please try again in a moment.'
              : `Retry pressed ${retryCount} time${retryCount === 1 ? '' : 's'}.`
          }
        />
      </section>
    </>
  );
}
