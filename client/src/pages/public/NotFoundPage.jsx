import LinkButton from '../../components/ui/LinkButton.jsx';

export default function NotFoundPage() {
  return (
    <>
      <h1>404</h1>
      <p>Page not found.</p>
      <p>
        <LinkButton to="/">Back to Home</LinkButton>
      </p>
    </>
  );
}
