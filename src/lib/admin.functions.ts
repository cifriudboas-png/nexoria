import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// About 100 years: Cloud Auth has no "forever", so a ban this long is permanent in practice.
const PERMANENT_BAN = '876000h';

/** Bans or unbans a player. Only the admin account can do this. */
export const setPlayerBanned = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; banned: boolean }) => {
    if (typeof input?.userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.userId)) {
      throw new Error('invalid_user');
    }
    if (typeof input.banned !== 'boolean') throw new Error('invalid_input');
    return { userId: input.userId, banned: input.banned };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    });
    if (isAdmin !== true) return { ok: false as const, error: 'forbidden' };

    // The database checks the admin role again and refuses to ban an admin.
    const { error } = await context.supabase.rpc('admin_set_banned', {
      _user_id: data.userId,
      _banned: data.banned,
    });
    if (error) return { ok: false as const, error: error.message };

    // Also block sign-in for the account itself.
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.banned ? PERMANENT_BAN : 'none',
    });
    if (authError) {
      console.error('Ban update failed', authError);
      return { ok: false as const, error: authError.message };
    }
    return { ok: true as const };
  });
