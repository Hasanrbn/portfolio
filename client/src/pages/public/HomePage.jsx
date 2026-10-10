import siteConfig from '@portfolio/shared/siteConfig.json';
import PageTitle from '../../components/layout/PageTitle.jsx';
import { PAGE_DESCRIPTIONS } from '../../utils/pageDescriptions.js';
import CallToAction from '../../components/sections/CallToAction.jsx';
import HighlightStrip from '../../components/sections/HighlightStrip.jsx';
import Hero from '../../components/sections/Hero.jsx';
import { getAvatarSource, getResumeLink } from '../../utils/profile.js';
import { getSocialLinks } from '../../utils/socialLinks.js';
import styles from './HomePage.module.css';

// Computed once: the config is a static file, so there is nothing to recompute per render.

export default function HomePage() {
  // Read when the page renders (not when the file loads), so edits to the profile are always
  // reflected and tests can set their own profile.
  const socialLinks = getSocialLinks(siteConfig);
  const avatarSrc = getAvatarSource(siteConfig.avatar);
  const resume = getResumeLink(siteConfig.resumeUrl);

  return (
    <>
      <PageTitle description={PAGE_DESCRIPTIONS.home} />
      <div className={styles.page}>
        <Hero
          name={siteConfig.name}
          role={siteConfig.role}
          intro={siteConfig.intro}
          availability={siteConfig.availability}
          avatarSrc={avatarSrc}
          resume={resume}
          socialLinks={socialLinks}
        />
        <HighlightStrip technologies={siteConfig.highlights} />
        <CallToAction />
      </div>
    </>
  );
}
