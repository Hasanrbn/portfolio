import siteConfig from '@portfolio/shared/siteConfig.json';

export default function HomePage() {
  return (
    <>
      <h1>{siteConfig.name}</h1>
      <p>{siteConfig.role}</p>
      <p>{siteConfig.intro}</p>
    </>
  );
}
