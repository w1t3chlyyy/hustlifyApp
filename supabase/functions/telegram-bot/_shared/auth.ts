// Admin authorization for the Telegram bot.
// We trust the comma-separated whitelist in ADMIN_TELEGRAM_IDS; isAdmin must
// be called for every admin-only command and every "a:*" callback.
import { supabase } from "./db.ts";

const RAW = Deno.env.get("ADMIN_TELEGRAM_IDS") ?? "";
export const ADMIN_TELEGRAM_IDS = RAW.split(",").map((s) => s.trim()).filter(Boolean);

export function isAdmin(tgId: number | string | null | undefined): boolean {
if (tgId === null || tgId === undefined) return false;
return ADMIN_TELEGRAM_IDS.includes(String(tgId));
}

// Owners (isAdmin) OR active moderators from the `moderators` table get
// access to the bot's /admin menu. Moderators were originally meant for
// web-panel-only access, but this also unlocks the in-bot /admin flow for
// them — meaning active moderators now have the SAME level of access as
// full owners inside the bot (products, orders, broadcasts, other
// moderators, etc.), not a restricted subset.
export async function isAdminOrModerator(tgId: number | string | null | undefined): Promise<boolean> {
if (isAdmin(tgId)) return true;
if (tgId === null || tgId === undefined) return false;
const { data } = await supabase
  .from("moderators")
  .select("telegram_id")
  .eq("telegram_id", Number(tgId))
  .eq("is_active", true)
  .maybeSingle();
return !!data;
}
