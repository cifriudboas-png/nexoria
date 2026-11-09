import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const PASSWORD_MIN_LENGTH = 8;
const INTERNAL_EMAIL_DOMAIN = 'nexoria.app';

export class AuthError extends Error {
  readonly key: TranslationKey;

  constructor(key: TranslationKey) {
    super(key);
    this.key = key;
  }
}

export type FieldError = {
  key: TranslationKey;
  params?: Record<string, number>;
};

export type SignupFormValues = {
  username: string;
  password: string;
  confirmPassword: string;
};

export type SignupFormErrors = Partial<Record<keyof SignupFormValues, FieldError>>;

export type LoginFormValues = {
  username: string;
  password: string;
};

export type LoginFormErrors = Partial<Record<keyof LoginFormValues, FieldError>>;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function toInternalEmail(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function validateSignupForm(values: SignupFormValues): SignupFormErrors {
  const errors: SignupFormErrors = {};
  const username = normalizeUsername(values.username);

  if (!username) {
    errors.username = { key: 'usernameRequired' };
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username = { key: 'usernameInvalid' };
  }

  if (!values.password) {
    errors.password = { key: 'passwordRequired' };
  } else if (values.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = { key: 'passwordMin', params: { min: PASSWORD_MIN_LENGTH } };
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = { key: 'confirmRequired' };
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = { key: 'passwordMismatch' };
  }

  return errors;
}

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};
  if (!normalizeUsername(values.username)) errors.username = { key: 'loginUsernameRequired' };
  if (!values.password) errors.password = { key: 'loginPasswordRequired' };
  return errors;
}

export function getCurrentUsername(): Promise<string | null> {
  return supabase.auth.getSession().then(({ data, error }) => {
    if (error) throw new AuthError('genericError');
    const username = data.session?.user.user_metadata?.['username'];
    return typeof username === 'string' ? username : null;
  });
}

export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}

export async function signUpWithUsername(
  username: string,
  password: string,
): Promise<{ username: string }> {
  const normalized = normalizeUsername(username);
  const { data, error } = await supabase.auth.signUp({
    email: toInternalEmail(normalized),
    password,
    options: { data: { username: normalized } },
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (error.code === 'user_already_exists' || message.includes('already registered')) {
      throw new AuthError('usernameTaken');
    }
    if (error.code === 'weak_password' || message.includes('weak')) {
      throw new AuthError('passwordWeak');
    }
    throw new AuthError('genericError');
  }

  if (!data.user) throw new AuthError('genericError');
  return { username: normalized };
}

export async function signInWithUsername(
  username: string,
  password: string,
): Promise<{ username: string }> {
  const normalized = normalizeUsername(username);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toInternalEmail(normalized),
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      throw new AuthError('invalidCredentials');
    }
    if (error.code === 'user_banned' || error.message.toLowerCase().includes('banned')) {
      throw new AuthError('accountBanned');
    }
    throw new AuthError('genericError');
  }

  if (!data.user) throw new AuthError('genericError');
  return { username: normalized };
}
