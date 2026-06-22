import { Controller } from "react-hook-form";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Textarea } from "./Textarea";

interface ControlledTextareaProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
}

export function ControlledTextarea<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  rows,
  placeholder,
  disabled,
}: ControlledTextareaProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Textarea
          {...field}
          id={name}
          label={label}
          hint={hint}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          error={fieldState.error?.message}
          value={field.value ?? ""}
        />
      )}
    />
  );
}
