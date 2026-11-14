<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- The NEXORIA app is one page at `/` (`src/routes/index.tsx` renders `src/components/NexoriaApp.tsx`); its screens switch with React state, not routes, because it was imported from a single-page Vite app and kept as-is.
- Theme and language preferences load from localStorage only after hydration (in `PreferencesProvider` effects), because the page is server-rendered and storage reads during render cause mismatches.
- Accounts sign in with a username mapped to a synthetic internal email, so email auto-confirm must stay on and email-based password reset is not available.
- Avatar items a player equips are saved on their own `profiles` row and changed only through a narrow security-definer RPC (e.g. `set_equipped_shirt`), because profiles has no general update policy and usernames/account numbers must stay read-only.
- Avatar 3D items (like hair) are built from CSS 3D pieces (`CharacterBlock` boxes, `CharacterSpike` pyramids) inside the existing CSS character viewer, not three.js, so they match and rotate with the imported character renderer.
- Catalog purchases go through the security-definer `purchase_item` RPC, which reads the price from the database `catalog_price` function, deducts `profiles.nexos` and adds an `inventory_items` row; the client price list in `src/lib/avatar.ts` is display-only and must be kept in sync with `catalog_price`, and equip RPCs for sold items require ownership.

- Admin access uses a separate `user_roles` table checked by the `has_role` security-definer function (never usernames or client state); the signup trigger grants `admin` only to the `nexoria` username and other admins are granted by inserting a `user_roles` row, and every admin RPC (`admin_list_players`, `admin_adjust_nexos`, `admin_set_banned`) re-checks the role in the database.
- Bans set `profiles.banned_at` through `admin_set_banned` and also ban the auth user from the `setPlayerBanned` server function, because the auth-level ban blocks sign-in while the column lets player RPCs refuse banned accounts.
- Friendships live in `friendships` (one row per pair, `pending` → `accepted`) and change only through security-definer RPCs (`send_friend_request`, `respond_friend_request`, `remove_friend`); other players are read only via `get_player_profile`, `search_players`, `list_friends`, `list_friend_requests`, which expose safe columns (no Nexos, no bans), because profiles RLS only lets players read their own row.
- Body colors are stored as a `profiles.body_colors` JSON object (only the parts a player changed) and saved through the `set_body_colors` RPC, which validates part names and `#RRGGBB` values; missing parts fall back to the look's default so older accounts keep their colors.
- Verified badges come from the read-only `profiles.is_verified` column (set only by database changes, never by players) and every player-reading RPC returns it.
- Chat messages live in `messages` (players can only SELECT their own rows; Realtime publishes inserts filtered by RLS); sending goes only through `send_message`, which checks bans, length and recipient, and conversations/read state through `list_conversations` and `mark_conversation_read`.
- Inappropriate-content filtering lives only in `src/lib/contentFilter.ts` (word lists, masks per category): chat text is filtered before `send_message` and again wherever player/item/game text is shown (`cleanText`), and signup rejects blocked usernames, because one list keeps chat, catalog and games consistent and display-time filtering also covers anything saved unfiltered.
- Nexoria Builder lives in `src/builder/`: world rules and the simple falling-block test are plain TypeScript in `world.ts` (unit-tested), the three.js scene is `BuilderScene.tsx` lazy-loaded so it never renders on the server, and worlds are saved per username in localStorage only, because there is no shared game storage yet.
