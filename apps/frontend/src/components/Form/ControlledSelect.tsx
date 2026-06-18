import { Controller } from 'react-hook-form';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Select } from './Select';

interface ControlledSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function ControlledSelect<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  disabled,
  children,
}: ControlledSelectProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Select
          {...field}
          id={name}
          label={label}
          hint={hint}
          disabled={disabled}
          error={fieldState.error?.message}
          value={field.value ?? ''}
        >
          {children}
        </Select>
      )}
    />
  );
}
