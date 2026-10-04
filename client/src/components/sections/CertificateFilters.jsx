import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import Select from '../ui/Select.jsx';
import styles from './CertificateFilters.module.css';

function FilterSelect({ label, allLabel, name, value, options, onChange }) {
  return (
    <FormField label={label}>
      {(controlProps) => (
        <Select
          name={name}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          {...controlProps}
        >
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      )}
    </FormField>
  );
}

/**
 * Menus to narrow the certificate list by issuer, year and category. A controlled form: the
 * parent keeps the values (in the address) and passes them in.
 */
export default function CertificateFilters({ values, options, onChange, onClear, resultText }) {
  const isFiltering = Boolean(values.issuer || values.year || values.category);

  return (
    <form
      role="search"
      aria-label="Filter certificates"
      className={styles.form}
      onSubmit={(event) => event.preventDefault()}
    >
      <div className={styles.fields}>
        <FilterSelect
          label="Issuer"
          allLabel="All issuers"
          name="issuer"
          value={values.issuer}
          options={options.issuers}
          onChange={onChange}
        />
        <FilterSelect
          label="Year"
          allLabel="All years"
          name="year"
          value={values.year}
          options={options.years}
          onChange={onChange}
        />
        <FilterSelect
          label="Category"
          allLabel="All categories"
          name="category"
          value={values.category}
          options={options.categories}
          onChange={onChange}
        />
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
