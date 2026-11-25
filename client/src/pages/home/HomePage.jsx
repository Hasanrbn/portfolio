import siteConfig from '@portfolio/shared/siteConfig.json';
import PageTitle from '../../components/layout/PageTitle.jsx';
import { PAGE_DESCRIPTIONS } from '../../utils/pageDescriptions.js';
import HighlightStrip from '../../components/sections/HighlightStrip.jsx';
import Hero from '../../components/sections/Hero.jsx';
import { getAvatarSource, getResumeLink } from '../../utils/profile.js';
import { getSocialLinks } from '../../utils/socialLinks.js';
import AboutSection from './AboutSection.jsx';
import CertificatesSection from './CertificatesSection.jsx';
import ContactSection from './ContactSection.jsx';
import EducationSection from './EducationSection.jsx';
import ExperienceSection from './ExperienceSection.jsx';
import ProjectsSection from './ProjectsSection.jsx';
import SkillsSection from './SkillsSection.jsx';
import styles from './HomePage.module.css';

/**
 * The whole site on one page: the opening block, then every section in the order of the menu.
 * The menu scrolls to a section instead of changing page.
 */
export default function HomePage() {
  // Read when the page renders (not when the file loads), so edits to the profile are always
  // reflected and tests can set their own profile.
  const socialLinks = getSocialLinks(siteConfig);
  const avatarSrc = getAvatarSource(siteConfig.avatar);
  const resume = getResumeLink(siteConfig.resumeUrl);

  return (
    <>
      <PageTitle description={PAGE_DESCRIPTIONS.home} />
      <div id="home" className={`container section ${styles.opening}`}>
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
      </div>
      <AboutSection />
      <SkillsSection />
      <ProjectsSection />
      <ExperienceSection />
      <EducationSection />
      <CertificatesSection />
      <ContactSection />
    </>
  );
}
