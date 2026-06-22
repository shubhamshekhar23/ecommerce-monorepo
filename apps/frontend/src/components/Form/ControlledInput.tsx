import { Controller } from "react-hook-form";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Input } from "./Input";

interface ControlledInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function ControlledInput<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  type,
  autoComplete,
  placeholder,
  disabled,
}: ControlledInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          {...field}
          id={name}
          label={label}
          hint={hint}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          error={fieldState.error?.message}
          value={field.value ?? ""}
        />
      )}
    />
  );
}
