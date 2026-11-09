import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import FormField from '@/components/FormField';
import { usePreferences } from '@/lib/preferences-context';
import {
  AuthError,
  signUpWithUsername,
  validateSignupForm,
  type FieldError,
  type SignupFormErrors,
  type SignupFormValues,
} from '@/lib/auth';

const INITIAL_VALUES: SignupFormValues = {
  username: '',
  password: '',
  confirmPassword: '',
};

type SignupFormProps = {
  onBack: () => void;
  onSuccess: (username: string) => void;
};

export default function SignupForm({ onBack, onSuccess }: SignupFormProps) {
  const { t } = usePreferences();
  const [values, setValues] = useState<SignupFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<SignupFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const message = (error?: FieldError) => (error ? t(error.key, error.params) : undefined);

  const handleChange =
    (field: keyof SignupFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setValues((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      setSubmitError(null);
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateSignupForm(values);
    setErrors(validationErrors);
    setSubmitError(null);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const { username } = await signUpWithUsername(values.username, values.password);
      onSuccess(username);
    } catch (err) {
      setSubmitError(err instanceof AuthError ? t(err.key) : t('unexpectedError'));
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <FormField
        id="signup-username"
        label={t('usernameLabel')}
        value={values.username}
        error={message(errors.username)}
        disabled={isSubmitting}
        autoComplete="username"
        onChange={handleChange('username')}
      />
      <FormField
        id="signup-password"
        label={t('passwordLabel')}
        type="password"
        value={values.password}
        error={message(errors.password)}
        disabled={isSubmitting}
        autoComplete="new-password"
        onChange={handleChange('password')}
      />
      <FormField
        id="signup-confirm-password"
        label={t('confirmPasswordLabel')}
        type="password"
        value={values.confirmPassword}
        error={message(errors.confirmPassword)}
        disabled={isSubmitting}
        autoComplete="new-password"
        onChange={handleChange('confirmPassword')}
      />

      {submitError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {submitError}
        </p>
      )}

      <div className="mt-2 flex flex-col gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-300 px-6 py-3.5 text-base font-semibold text-green-950 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-green-400 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none dark:focus-visible:ring-offset-stone-900"
        >
          {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
          {isSubmitting ? t('creatingAccount') : t('createAccount')}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-medium text-stone-600 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-70 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </button>
      </div>
    </form>
  );
}
