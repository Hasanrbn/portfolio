import { useEffect, useRef } from 'react';
import siteConfig from '@portfolio/shared/siteConfig.json';
import Section from '../../components/layout/Section.jsx';
import ContactForm from '../../components/sections/ContactForm.jsx';
import SocialLinks from '../../components/sections/SocialLinks.jsx';
import Card from '../../components/ui/Card.jsx';
import LinkButton from '../../components/ui/LinkButton.jsx';
import { getSocialLinks } from '../../utils/socialLinks.js';
import { wakeServer } from '../../services/contactService.js';
import styles from './ContactSection.module.css';

// Start waking the server a little before the section is reached.
const WAKE_MARGIN = '600px 0px';

export default function ContactSection() {
  const links = getSocialLinks(siteConfig);
  const email = links.find((link) => link.id === 'email');
  const sectionRef = useRef(null);

  // A free server sleeps when unused. The message form is at the very end of the page, so the
  // server starts waking as the visitor nears it (or at once when scrolling is not observable).
  useEffect(() => {
    const element = sectionRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      wakeServer();
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          wakeServer();
          observer.disconnect();
        }
      },
      { rootMargin: WAKE_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Section
      id="contact"
      title="Contact"
      lead="Have a project, an opportunity or a question? Send me a message and I will reply by email."
    >
      <div className={styles.finale}>
        {/* Decorative: the heading below carries the message. */}
        <p className={styles.thanks} aria-hidden="true">
          Thanks for scrolling
          <svg className={styles.doodle} viewBox="0 0 64 48" fill="none" focusable="false">
            <path
              d="M4 6c14-2 30 4 36 18 3 7 2 14-2 18m0 0-9-2m9 2 1-10"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </p>
        <h3 className={styles.together}>
          Let’s work <span className={styles.accent}>together</span>.
        </h3>
        {email && (
          <LinkButton href={email.href} size="lg">
            Say hello
          </LinkButton>
        )}
      </div>

      <div ref={sectionRef} className={links.length > 0 ? styles.layout : styles.layoutSingle}>
        <Card as="section" aria-labelledby="contact-form-heading" className={styles.formCard}>
          <h3 id="contact-form-heading" className={styles.heading}>
            Send a message
          </h3>
          <ContactForm />
        </Card>

        {links.length > 0 && (
          <section aria-labelledby="contact-links-heading" className={styles.aside}>
            <h3 id="contact-links-heading" className={styles.heading}>
              Other ways to reach me
            </h3>
            <SocialLinks links={links} className={styles.links} />
          </section>
        )}
      </div>
    </Section>
  );
}
