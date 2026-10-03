import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import styles from './ProjectFilters.module.css';

/**
 * Search box and menus to narrow the project list. It is a controlled form: the parent keeps
 * the values (in the address bar) and passes them in. Pressing Enter does not reload the page.
 */
export default function ProjectFilters({
  values,
  categories,
  technologies,
  onChange,
  onClear,
  resultText,
}) {
  const isFiltering = Boolean(values.q || values.category || values.tech);

  return (
    <form
      role="search"
      aria-label="Filter projects"
      className={styles.form}
      onSubmit={(event) => event.preventDefault()}
    >
      <div className={styles.fields}>
        <FormField label="Search">
          {(controlProps) => (
            <Input
              type="search"
              name="q"
              autoComplete="off"
              placeholder="Title or technology"
              value={values.q}
              onChange={(event) => onChange('q', event.target.value)}
              {...controlProps}
            />
          )}
        </FormField>

        <FormField label="Category">
          {(controlProps) => (
            <Select
              name="category"
              value={values.category}
              onChange={(event) => onChange('category', event.target.value)}
              {...controlProps}
            >
              <option value="">All categories</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField label="Technology">
          {(controlProps) => (
            <Select
              name="tech"
              value={values.tech}
              onChange={(event) => onChange('tech', event.target.value)}
              {...controlProps}
            >
              <option value="">All technologies</option>
              {technologies.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>

      <div className={styles.footer}>
        <p role="status" className={styles.result}>
          {resultText}
        </p>
        {isFiltering && (
          <Button variant="ghost" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>
    </form>
  );
}
