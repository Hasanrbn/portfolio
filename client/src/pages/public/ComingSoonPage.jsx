import PageTitle from '../../components/layout/PageTitle.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LinkButton from '../../components/ui/LinkButton.jsx';
import styles from './ComingSoonPage.module.css';

// Stand-in for pages that are built in later phases, so every navigation link works.
// Each page is removed from the placeholder list in App.jsx when its real version lands.
export default function ComingSoonPage({ title }) {
  return (
    <>
      <PageTitle title={title} />
      <h1>{title}</h1>
      <EmptyState
        className={styles.state}
        title="Coming soon"
        description="This page is still being built."
        action={<LinkButton to="/">Back to Home</LinkButton>}
      />
    </>
  );
}
