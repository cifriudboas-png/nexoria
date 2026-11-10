import { supabase } from '@/lib/supabase';

export type ProfileDetails = {
  accountNumber: number;
  createdAt: string;
  isVerified: boolean;
};

export async function getProfileDetails(): Promise<ProfileDetails | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('account_number, created_at, is_verified')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  if (typeof data.account_number !== 'number' || typeof data.created_at !== 'string') {
    throw new Error('Unexpected profile response');
  }
  return { accountNumber: data.account_number, createdAt: data.created_at, isVerified: data.is_verified === true };
}
