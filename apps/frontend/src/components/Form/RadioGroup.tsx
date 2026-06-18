import { ErrorMessage } from './ErrorMessage';
import styles from './RadioGroup.module.scss';

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  id: string;
  legend: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  name: string;
}

export function RadioGroup({ id, legend, options, value, onChange, error, name }: RadioGroupProps) {
  const errorId = `${id}-error`;

  return (
    <fieldset className={styles.fieldset} aria-describedby={error ? errorId : undefined}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange?.(option.value)}
              className={styles.radio}
              aria-invalid={error ? 'true' : undefined}
            />
            <span className={styles.optionLabel}>{option.label}</span>
          </label>
        ))}
      </div>
      <ErrorMessage message={error} id={errorId} />
    </fieldset>
  );
}
