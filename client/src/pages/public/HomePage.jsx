import siteConfig from '@portfolio/shared/siteConfig.json';
import PageTitle from '../../components/layout/PageTitle.jsx';

export default function HomePage() {
  return (
    <>
      <PageTitle />
      <h1>{siteConfig.name}</h1>
      <p>{siteConfig.role}</p>
      <p>{siteConfig.intro}</p>
    </>
  );
}
