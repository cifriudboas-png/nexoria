import type { ChangeEvent } from 'react';

type FormFieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string | undefined;
  disabled: boolean;
  autoComplete: string;
  type?: 'text' | 'password';
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function FormField({
  id,
  label,
  value,
  error,
  disabled,
  autoComplete,
  type = 'text',
  onChange,
}: FormFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-stone-800 dark:text-stone-200">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 transition-colors duration-200 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-stone-100 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:disabled:bg-stone-800/60 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:border-red-500 dark:focus:ring-red-900'
            : 'border-stone-300 focus:border-green-600 focus:ring-green-200 dark:border-stone-600 dark:focus:border-green-500 dark:focus:ring-green-900'
        }`}
      />
      {error && (
        <p id={errorId} className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
