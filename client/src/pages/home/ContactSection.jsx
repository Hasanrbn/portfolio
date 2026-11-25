import { useEffect, useRef } from 'react';
import siteConfig from '@portfolio/shared/siteConfig.json';
import Section from '../../components/layout/Section.jsx';
import ContactForm from '../../components/sections/ContactForm.jsx';
import SocialLinks from '../../components/sections/SocialLinks.jsx';
import Card from '../../components/ui/Card.jsx';
import { getSocialLinks } from '../../utils/socialLinks.js';
import { wakeServer } from '../../services/contactService.js';
import styles from './ContactSection.module.css';

// Start waking the server a little before the section is reached.
const WAKE_MARGIN = '600px 0px';

export default function ContactSection() {
  const links = getSocialLinks(siteConfig);
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
