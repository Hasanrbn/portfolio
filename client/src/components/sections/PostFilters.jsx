import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import styles from './PostFilters.module.css';

/**
 * Search box and menus to narrow the article list by category and tag. A controlled form: the
 * parent keeps the values (in the address) and passes them in.
 */
export default function PostFilters({ values, categories, tags, onChange, onClear, resultText }) {
  const isFiltering = Boolean(values.q || values.category || values.tag);

  return (
    <form
      role="search"
      aria-label="Filter articles"
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
              placeholder="Title, topic or text"
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

        <FormField label="Tag">
          {(controlProps) => (
            <Select
              name="tag"
              value={values.tag}
              onChange={(event) => onChange('tag', event.target.value)}
              {...controlProps}
            >
              <option value="">All tags</option>
              {tags.map((name) => (
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
