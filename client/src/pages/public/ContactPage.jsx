import siteConfig from '@portfolio/shared/siteConfig.json';
import PageTitle from '../../components/layout/PageTitle.jsx';
import { PAGE_DESCRIPTIONS } from '../../utils/pageDescriptions.js';
import ContactForm from '../../components/sections/ContactForm.jsx';
import SocialLinks from '../../components/sections/SocialLinks.jsx';
import Card from '../../components/ui/Card.jsx';
import { getSocialLinks } from '../../utils/socialLinks.js';
import styles from './ContactPage.module.css';

export default function ContactPage() {
  const links = getSocialLinks(siteConfig);

  return (
    <>
      <PageTitle title="Contact" description={PAGE_DESCRIPTIONS.contact} />
      <div className={styles.page}>
        <header className={styles.intro}>
          <h1>Contact</h1>
          <p className={styles.lead}>
            Have a project, an opportunity or a question? Send me a message and I will reply by
            email.
          </p>
        </header>

        <div className={links.length > 0 ? styles.layout : styles.layoutSingle}>
          <Card as="section" aria-labelledby="contact-form-heading" className={styles.formCard}>
            <h2 id="contact-form-heading" className={styles.heading}>
              Send a message
            </h2>
            <ContactForm />
          </Card>

          {links.length > 0 && (
            <section aria-labelledby="contact-links-heading" className={styles.aside}>
              <h2 id="contact-links-heading" className={styles.heading}>
                Other ways to reach me
              </h2>
              <SocialLinks links={links} className={styles.links} />
            </section>
          )}
        </div>
      </div>
    </>
  );
}
