// Moderators admin: add/remove people who can log into the web admin panel
// (/admin) with their own password, without sharing the owner's ADMIN_PASSWORD
// or their Telegram ID in ADMIN_TELEGRAM_IDS.
import { tg, deleteAndSend } from "../_shared/tg.ts";
import { supabase, writeAuditLog } from "../_shared/db.ts";
import { setSession, clearSession } from "../_shared/session.ts";

const WEBAPP_URL = Deno.env.get("WEBAPP_URL") ?? "";

function backRow() {
return [{ text: "← Меню", callback_data: "a:menu" }];
}

async function sha256Hex(text: string): Promise<string> {
const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function genPassword(len = 12): string {
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const bytes = crypto.getRandomValues(new Uint8Array(len));
return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function showModeratorsMenu(chatId: number, msgId?: number) {
const { data } = await supabase
  .from("moderators")
  .select("telegram_id, username, is_active, created_at")
  .order("created_at", { ascending: false });

const rows = (data ?? []).map((m) => [{
  text: `${m.is_active ? "" : "[откл.] "}${m.username ? "@" + m.username : m.telegram_id}`,
  callback_data: `a:mod:v:${m.telegram_id}`,
}]);
rows.push([{ text: "Добавить модератора по ID", callback_data: "a:mod:n" }]);
rows.push(backRow());

await deleteAndSend(chatId, msgId, {
  text: "<b>Модераторы</b>\n\nЭти люди могут заходить в веб-админку (/admin) со своим паролем.\nНа доступ к этому меню бота они не влияют.",
  parse_mode: "HTML",
  reply_markup: { inline_keyboard: rows },
});
}

export async function showModerator(chatId: number, msgId: number | undefined, telegramIdStr: string) {
const tid = Number(telegramIdStr);
const { data: m } = await supabase.from("moderators").select("*").eq("telegram_id", tid).maybeSingle();
if (!m) return showModeratorsMenu(chatId, msgId);
const text = [
  `<b>Модератор</b>`,
  `ID: <code>${m.telegram_id}</code>`,
  m.username ? `@${m.username}` : "",
  `Статус: ${m.is_active ? "активен" : "отключен"}`,
  `Добавлен: ${new Date(m.created_at).toLocaleString("ru-RU")}`,
].filter(Boolean).join("\n");
await deleteAndSend(chatId, msgId, {
  text,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ text: m.is_active ? "Отключить доступ" : "Включить доступ", callback_data: `a:mod:t:${tid}` }],
      [{ text: "Выдать новый пароль", callback_data: `a:mod:rp:${tid}` }],
      [{ text: "Удалить", callback_data: `a:mod:d:${tid}` }],
      [{ text: "← К списку", callback_data: "a:mod" }],
    ],
  },
});
}

export async function toggleModerator(chatId: number, msgId: number | undefined, telegramIdStr: string, adminId: number) {
const tid = Number(telegramIdStr);
const { data: m } = await supabase.from("moderators").select("is_active").eq("telegram_id", tid).maybeSingle();
if (!m) return showModeratorsMenu(chatId, msgId);
await supabase.from("moderators").update({ is_active: !m.is_active }).eq("telegram_id", tid);
await writeAuditLog(adminId, "moderator.toggle", String(tid), { is_active: !m.is_active });
return showModerator(chatId, msgId, telegramIdStr);
}

export async function removeModerator(chatId: number, msgId: number | undefined, telegramIdStr: string, adminId: number) {
const tid = Number(telegramIdStr);
await supabase.from("moderators").delete().eq("telegram_id", tid);
await writeAuditLog(adminId, "moderator.remove", String(tid), {});
return showModeratorsMenu(chatId, msgId);
}

export async function startAddModerator(chatId: number, msgId: number | undefined, adminId: number) {
await setSession(adminId, "mod:add", {});
await deleteAndSend(chatId, msgId, {
  text: "Пришлите <b>Telegram ID</b> человека, которого хотите сделать модератором.\n\nУзнать свой ID можно, написав боту @userinfobot.",
  parse_mode: "HTML",
  reply_markup: { inline_keyboard: [[{ text: "Отмена", callback_data: "a:mod" }]] },
});
}

async function issuePasswordAndNotify(chatId: number, adminId: number, targetId: number, isReset: boolean) {
const password = genPassword();
const password_hash = await sha256Hex(password);

// Try to grab a username for display purposes (best-effort; not required).
let username: string | null = null;
try {
  const { data: u } = await supabase.from("user_profiles").select("username").eq("telegram_id", targetId).maybeSingle();
  username = u?.username ?? null;
} catch { /* ignore */ }

const { error } = await supabase.from("moderators").upsert(
  { telegram_id: targetId, username, password_hash, is_active: true, added_by: adminId },
  { onConflict: "telegram_id" },
);

if (error) {
  await deleteAndSend(chatId, undefined, { text: `Ошибка: ${error.message}` });
  return;
}

const adminUrl = WEBAPP_URL ? `${WEBAPP_URL.replace(/\/$/, "")}/admin` : "ссылку на админку уточните у владельца бота";
const dmText = [
  isReset ? "<b>Ваш пароль от админ-панели обновлён</b>" : "<b>Вы назначены модератором Hustlify</b>",
  "",
  `Ссылка: ${adminUrl}`,
  `Пароль: <code>${password}</code>`,
  "",
  "Никому не сообщайте этот пароль.",
].join("\n");

let delivered = true;
try {
  await tg("sendMessage", { chat_id: targetId, text: dmText, parse_mode: "HTML" });
} catch {
  delivered = false;
}

await writeAuditLog(adminId, isReset ? "moderator.reset_password" : "moderator.add", String(targetId), {});

await deleteAndSend(chatId, undefined, {
  text: delivered
    ? `Готово. Пользователю <code>${targetId}</code> отправлен пароль от админки в личные сообщения.`
    : `Модератор сохранён, но написать ему в Telegram не удалось (он мог не запускать бота). Пароль: <code>${password}</code> — придётся передать вручную.`,
  parse_mode: "HTML",
  reply_markup: { inline_keyboard: [[{ text: "← К модераторам", callback_data: "a:mod" }]] },
});
}

export async function applyAddModerator(chatId: number, adminId: number, raw: string) {
await clearSession(adminId);
const idStr = raw.trim();
if (!/^\d{5,}$/.test(idStr)) {
  await deleteAndSend(chatId, undefined, {
    text: "Это не похоже на Telegram ID. Пришлите просто число, например 5119044165.",
    reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "a:mod" }]] },
  });
  return;
}
await issuePasswordAndNotify(chatId, adminId, Number(idStr), false);
}

export async function resetModeratorPassword(chatId: number, msgId: number | undefined, telegramIdStr: string, adminId: number) {
await issuePasswordAndNotify(chatId, adminId, Number(telegramIdStr), true);
}

// FSM dispatch helper for mod:* states (called from index.ts handleAdminText).
export async function handleModeratorText(chatId: number, adminId: number, sessState: string, text: string): Promise<boolean> {
if (sessState !== "mod:add") return false;
await applyAddModerator(chatId, adminId, text);
return true;
}
