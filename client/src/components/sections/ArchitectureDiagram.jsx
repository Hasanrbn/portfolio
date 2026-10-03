import styles from './ArchitectureDiagram.module.css';

/**
 * Shows how a request travels through the layers of a project (Frontend, API, Backend,
 * Database). It is an ordered list, so a screen reader hears the same order that sighted
 * visitors follow with the arrows, which are decorative.
 */
export default function ArchitectureDiagram({ layers }) {
  if (layers.length === 0) {
    return null;
  }

  return (
    <ol className={styles.diagram} aria-label="Layers, from the browser to the data">
      {layers.map((layer) => (
        <li key={layer.name} className={styles.layer}>
          <strong className={styles.name}>{layer.name}</strong>
          {layer.detail && <span className={styles.detail}>{layer.detail}</span>}
        </li>
      ))}
    </ol>
  );
}
