// Admin API — password-protected backend for the web admin panel (/admin).
//
// Requires two Supabase secrets to be set before deploying:
//   ADMIN_PASSWORD      — the password used to log into /admin
//   ADMIN_TOKEN_SECRET   — any long random string, used to sign session tokens
//
// Deploy with:
//   supabase functions deploy admin-api --no-verify-jwt
//   supabase secrets set ADMIN_PASSWORD=your-password ADMIN_TOKEN_SECRET=some-long-random-string
//
// This function uses the service role key, so it bypasses Row Level Security —
// that's the whole point (the public anon key can only read, never write).
// Treat the ADMIN_PASSWORD like any other production secret.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "node:crypto";

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const jsonRes = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12h session

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function makeToken(): string {
  const secret = Deno.env.get("ADMIN_TOKEN_SECRET");
  if (!secret) throw new Error("ADMIN_TOKEN_SECRET is not set");
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = JSON.stringify({ exp });
  const encoded = btoa(payload);
  const sig = sign(encoded, secret);
  return `${encoded}.${sig}`;
}

function verifyToken(token: string | null): boolean {
  if (!token) return false;
  const secret = Deno.env.get("ADMIN_TOKEN_SECRET");
  if (!secret) return false;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return false;
  const expected = sign(encoded, secret);
  try {
    const a = new TextEncoder().encode(sig);
    const b = new TextEncoder().encode(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  try {
    const { exp } = JSON.parse(atob(encoded));
    return typeof exp === "number" && Math.floor(Date.now() / 1000) < exp;
  } catch {
    return false;
  }
}

function getBearer(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

// ---- small shared helpers for the sections below ----
function escapeHtml(s: string | null | undefined) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
async function tgSend(chatId: number, text: string, extra: Record<string, unknown> = {}) {
  if (!TELEGRAM_BOT_TOKEN) return { ok: false, description: "TELEGRAM_BOT_TOKEN не настроен" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, ...extra }),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, description: String(e) };
  }
}

function genPassword(len = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function writeAuditLog(action: string, target: string | null, meta: Record<string, unknown> = {}) {
  try {
    await supabase.from("admin_log").insert({ admin_telegram_id: 0, action, target, meta });
  } catch (e) {
    console.error("[admin-api] audit log failed", e);
  }
}

// Supabase caps a single .select() at 1000 rows — page through with .range()
// until a page comes back short, so aggregate stats reflect TRUE totals.
async function fetchAll<T = any>(build: (from: number, to: number) => any, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

function pageRange(page: number, pageSize: number): [number, number] {
  const from = Math.max(0, page) * pageSize;
  return [from, from + pageSize - 1];
}

const STAT_RANGES: Record<string, number | null> = { d: 1, w: 7, m: 30, all: null };
function sinceFor(range: string): string | null {
  const days = STAT_RANGES[range] ?? 7;
  return days ? new Date(Date.now() - days * 86400_000).toISOString() : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body || {};

    // ---- Login (no auth required) ----
    if (action === "login") {
      const ownerPassword = Deno.env.get("ADMIN_PASSWORD");
      const submitted = String(body.password ?? "");
      let authenticated = !!ownerPassword && submitted === ownerPassword;

      if (!authenticated && submitted) {
        const hash = await sha256Hex(submitted);
        const { data: mod } = await supabase
          .from("moderators")
          .select("telegram_id, is_active")
          .eq("password_hash", hash)
          .eq("is_active", true)
          .maybeSingle();
        if (mod) authenticated = true;
      }

      if (!ownerPassword) return jsonRes({ error: "ADMIN_PASSWORD не настроен на сервере" }, 500);
      if (!authenticated) return jsonRes({ error: "Неверный пароль" }, 401);
      try {
        return jsonRes({ token: makeToken() });
      } catch {
        return jsonRes({ error: "ADMIN_TOKEN_SECRET не настроен на сервере" }, 500);
      }
    }

    // ---- Everything else requires a valid session token ----
    if (!verifyToken(getBearer(req))) {
      return jsonRes({ error: "Требуется вход в админ-панель" }, 401);
    }

    switch (action) {
      // ===== CASES =====
      case "cases.list": {
        const { data, error } = await supabase.from("cases").select("*").order("sort_order");
        if (error) throw error;
        return jsonRes({ data });
      }
      case "cases.upsert": {
        const { row } = body;
        if (!row) return jsonRes({ error: "row required" }, 400);
        const payload = { ...row, updated_at: new Date().toISOString() };
        const { data, error } = await supabase.from("cases").upsert(payload).select().maybeSingle();
        if (error) throw error;
        return jsonRes({ data });
      }
      case "cases.delete": {
        const { id } = body;
        if (!id) return jsonRes({ error: "id required" }, 400);
        const { error } = await supabase.from("cases").delete().eq("id", id);
        if (error) throw error;
        return jsonRes({ ok: true });
      }

      // ===== CATEGORIES =====
      case "categories.list": {
        const { data, error } = await supabase.from("categories").select("*").order("sort_order");
        if (error) throw error;
        return jsonRes({ data });
      }
      case "categories.upsert": {
        const { row } = body;
        if (!row) return jsonRes({ error: "row required" }, 400);
        if (!row.id) return jsonRes({ error: "id (slug) required" }, 400);
        const { data, error } = await supabase.from("categories").upsert(row).select().maybeSingle();
        if (error) throw error;
        return jsonRes({ data });
      }
      case "categories.delete": {
        const { id } = body;
        if (!id) return jsonRes({ error: "id required" }, 400);
        const { error } = await supabase.from("categories").delete().eq("id", id);
        if (error) throw error;
        return jsonRes({ ok: true });
      }

      // ===== PROJECTS =====
      case "projects.list": {
        const { data, error } = await supabase.from("projects").select("*").order("sort_order");
        if (error) throw error;
        return jsonRes({ data });
      }
      case "projects.upsert": {
        const { row } = body;
        if (!row) return jsonRes({ error: "row required" }, 400);
        if (!row.id) return jsonRes({ error: "id (slug) required" }, 400);
        const payload = { ...row, updated_at: new Date().toISOString() };
        const { data, error } = await supabase.from("projects").upsert(payload).select().maybeSingle();
        if (error) throw error;
        return jsonRes({ data });
      }
      case "projects.delete": {
        const { id } = body;
        if (!id) return jsonRes({ error: "id required" }, 400);
        const { error } = await supabase.from("projects").delete().eq("id", id);
        if (error) throw error;
        return jsonRes({ ok: true });
      }

      // ===== STORAGE (image uploads from the admin panel) =====
      case "storage.upload": {
        const { fileBase64, fileName, contentType, folder } = body;
        if (!fileBase64 || !fileName) return jsonRes({ error: "fileBase64 and fileName required" }, 400);
        // ~8MB decoded limit (base64 is ~4/3 the size of the original bytes)
        if (fileBase64.length > 11_000_000) {
          return jsonRes({ error: "Файл слишком большой (максимум ~8 МБ)" }, 400);
        }
        let bytes: Uint8Array;
        try {
          bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
        } catch {
          return jsonRes({ error: "Некорректные данные файла" }, 400);
        }
        const rawExt = (String(fileName).split(".").pop() || "jpg").toLowerCase();
        const ext = /^[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : "jpg";
        const safeFolder = typeof folder === "string" ? folder.replace(/[^a-z0-9-_]/gi, "") : "";
        const key = `${safeFolder ? safeFolder + "/" : ""}${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(key, bytes, {
          contentType: contentType || "application/octet-stream",
          upsert: false,
        });
        if (error) throw error;
        const { data } = supabase.storage.from("product-images").getPublicUrl(key);
        return jsonRes({ url: data.publicUrl });
      }

      // ===== PRODUCTS =====
      case "products.list": {
        const { data, error } = await supabase.from("products").select("*").order("sort_order");
        if (error) throw error;
        return jsonRes({ data });
      }
      case "products.upsert": {
        const { row } = body;
        if (!row) return jsonRes({ error: "row required" }, 400);
        const payload = { ...row, updated_at: new Date().toISOString() };
        const { data, error } = await supabase.from("products").upsert(payload).select().maybeSingle();
        if (error) throw error;
        return jsonRes({ data });
      }
      case "products.delete": {
        const { id } = body;
        if (!id) return jsonRes({ error: "id required" }, 400);
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;
        return jsonRes({ ok: true });
      }

      // ===== REVIEWS =====
      case "reviews.list": {
        const { data, error } = await supabase
          .from("reviews")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return jsonRes({ data });
      }
      case "reviews.setStatus": {
        const { id, status } = body; // status: 'approved' | 'rejected' | 'pending'
        if (!id || !status) return jsonRes({ error: "id and status required" }, 400);
        const patch: Record<string, unknown> = { moderation_status: status };
        if (status === "approved") patch.verified = true;
        if (status === "rejected") patch.verified = false;
        const { error } = await supabase.from("reviews").update(patch).eq("id", id);
        if (error) throw error;
        return jsonRes({ ok: true });
      }
      case "reviews.update": {
        const { id, row } = body;
        if (!id || !row) return jsonRes({ error: "id and row required" }, 400);
        const { error } = await supabase.from("reviews").update(row).eq("id", id);
        if (error) throw error;
        return jsonRes({ ok: true });
      }
      case "reviews.delete": {
        const { id } = body;
        if (!id) return jsonRes({ error: "id required" }, 400);
        const { error } = await supabase.from("reviews").delete().eq("id", id);
        if (error) throw error;
        return jsonRes({ ok: true });
      }

      // ===== SITE SETTINGS =====
      case "settings.list": {
        const { data, error } = await supabase.from("site_settings").select("*").order("key");
        if (error) throw error;
        return jsonRes({ data });
      }
      case "settings.set": {
        const { key, value } = body;
        if (!key) return jsonRes({ error: "key required" }, 400);
        const { error } = await supabase
          .from("site_settings")
          .upsert({ key, value: value ?? "", updated_at: new Date().toISOString() });
        if (error) throw error;
        return jsonRes({ ok: true });
      }

      // ===== USERS =====
      case "users.list": {
        const page = Number(body.page ?? 0);
        const pageSize = Math.min(100, Number(body.pageSize ?? 20));
        const search = String(body.search ?? "").trim();
        const [from, to] = pageRange(page, pageSize);
        let q = supabase
          .from("user_profiles")
          .select("telegram_id, first_name, last_name, username, balance, is_blocked, is_premium, created_at", { count: "exact" });
        if (search) {
          const asId = /^\d+$/.test(search) ? search : null;
          q = asId
            ? q.eq("telegram_id", Number(asId))
            : q.or(`username.ilike.%${search}%,first_name.ilike.%${search}%`);
        }
        q = q.order("created_at", { ascending: false }).range(from, to);
        const { data, count, error } = await q;
        if (error) throw error;
        return jsonRes({ data, total: count ?? 0, page, pageSize });
      }
      case "users.get": {
        const telegramId = Number(body.telegramId);
        if (!telegramId) return jsonRes({ error: "telegramId required" }, 400);
        const { data: user, error } = await supabase.from("user_profiles").select("*").eq("telegram_id", telegramId).maybeSingle();
        if (error) throw error;
        if (!user) return jsonRes({ error: "Пользователь не найден" }, 404);
        const { count: ordersCount } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("telegram_id", telegramId);
        return jsonRes({ user, ordersCount: ordersCount ?? 0 });
      }
      case "users.setBalance": {
        const telegramId = Number(body.telegramId);
        const dir = body.dir === "deduct" ? "deduct" : "credit";
        const amount = Number(body.amount);
        const comment = String(body.comment ?? "").trim();
        if (!telegramId || !isFinite(amount) || amount <= 0) return jsonRes({ error: "telegramId и amount > 0 обязательны" }, 400);
        const rpc = dir === "credit" ? "credit_balance" : "deduct_balance";
        const { data: newBal, error } = await supabase.rpc(rpc, { p_telegram_id: telegramId, p_amount: amount });
        if (error) return jsonRes({ error: error.message }, 400);
        await supabase.from("balance_history").insert({
          telegram_id: telegramId, admin_telegram_id: 0, type: dir, amount,
          balance_after: Number(newBal ?? 0),
          comment: comment || (dir === "credit" ? "Начисление администратором" : "Списание администратором"),
        });
        await writeAuditLog(`user.balance.${dir}`, String(telegramId), { amount, comment, balance_after: newBal });
        return jsonRes({ ok: true, balance: Number(newBal ?? 0) });
      }
      case "users.balanceHistory": {
        const telegramId = Number(body.telegramId);
        const page = Number(body.page ?? 0);
        const pageSize = Math.min(100, Number(body.pageSize ?? 20));
        if (!telegramId) return jsonRes({ error: "telegramId required" }, 400);
        const [from, to] = pageRange(page, pageSize);
        const { data, count, error } = await supabase
          .from("balance_history")
          .select("id, type, amount, balance_after, comment, created_at, admin_telegram_id", { count: "exact" })
          .eq("telegram_id", telegramId)
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        return jsonRes({ data, total: count ?? 0, page, pageSize });
      }
      case "users.toggleBlock": {
        const telegramId = Number(body.telegramId);
        if (!telegramId) return jsonRes({ error: "telegramId required" }, 400);
        const { data: u } = await supabase.from("user_profiles").select("is_blocked").eq("telegram_id", telegramId).maybeSingle();
        if (!u) return jsonRes({ error: "Пользователь не найден" }, 404);
        const next = !u.is_blocked;
        await supabase.from("user_profiles").update({ is_blocked: next }).eq("telegram_id", telegramId);
        await writeAuditLog("user.block", String(telegramId), { is_blocked: next });
        return jsonRes({ ok: true, is_blocked: next });
      }
      case "users.setNote": {
        const telegramId = Number(body.telegramId);
        if (!telegramId) return jsonRes({ error: "telegramId required" }, 400);
        const value = body.note ? String(body.note) : null;
        await supabase.from("user_profiles").update({ internal_note: value }).eq("telegram_id", telegramId);
        await writeAuditLog("user.note", String(telegramId), { value });
        return jsonRes({ ok: true });
      }

      // ===== ORDERS =====
      case "orders.list": {
        const filter = String(body.filter ?? "all");
        const page = Number(body.page ?? 0);
        const pageSize = Math.min(100, Number(body.pageSize ?? 20));
        const [from, to] = pageRange(page, pageSize);
        let q = supabase.from("orders").select(
          "id, order_number, status, payment_status, total_amount, telegram_id, project_id, created_at",
          { count: "exact" },
        );
        if (filter === "new") q = q.in("status", ["pending", "awaiting_payment", "paid"]);
        else if (filter === "active") q = q.in("status", ["paid", "processing"]);
        else if (filter === "done") q = q.in("status", ["delivered", "completed"]);
        else if (filter === "issues") q = q.in("status", ["error", "cancelled"]);
        q = q.order("created_at", { ascending: false }).range(from, to);
        const { data, count, error } = await q;
        if (error) throw error;
        return jsonRes({ data, total: count ?? 0, page, pageSize });
      }
      case "orders.get": {
        const { id } = body;
        if (!id) return jsonRes({ error: "id required" }, 400);
        const { data: order, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        if (!order) return jsonRes({ error: "Заказ не найден" }, 404);
        const { data: items } = await supabase.from("order_items").select("product_title, product_price, quantity, params").eq("order_id", id);
        const { data: user } = await supabase.from("user_profiles").select("first_name, username, balance").eq("telegram_id", order.telegram_id).maybeSingle();
        return jsonRes({ order, items: items ?? [], user });
      }
      case "orders.setStatus": {
        const { id, status } = body;
        if (!id || !status) return jsonRes({ error: "id and status required" }, 400);
        const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        await writeAuditLog("order.status", id, { status });
        return jsonRes({ ok: true });
      }
      case "orders.setPayment": {
        const { id, status } = body;
        if (!id || !status) return jsonRes({ error: "id and status required" }, 400);
        const { error } = await supabase.from("orders").update({ payment_status: status, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        await writeAuditLog("order.payment_status", id, { payment_status: status });
        return jsonRes({ ok: true });
      }
      case "orders.refund": {
        const { id } = body;
        if (!id) return jsonRes({ error: "id required" }, 400);
        const { data: o } = await supabase.from("orders").select("id, order_number, telegram_id, total_amount, payment_status, status").eq("id", id).maybeSingle();
        if (!o) return jsonRes({ error: "Заказ не найден" }, 404);
        if (o.payment_status === "refunded") return jsonRes({ error: "Уже возвращён ранее" }, 400);
        const amount = Number(o.total_amount);
        if (!amount || amount <= 0) return jsonRes({ error: "Нулевая сумма — нечего возвращать" }, 400);
        const { data: locked, error: lockErr } = await supabase
          .from("orders")
          .update({ payment_status: "refunded", status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", id).neq("payment_status", "refunded")
          .select("id").maybeSingle();
        if (lockErr || !locked) return jsonRes({ error: "Возврат уже выполнен или невозможен" }, 400);
        const { data: newBal, error } = await supabase.rpc("credit_balance", { p_telegram_id: o.telegram_id, p_amount: amount });
        if (error) {
          await supabase.from("orders").update({ payment_status: o.payment_status, status: o.status }).eq("id", id);
          return jsonRes({ error: error.message }, 400);
        }
        await supabase.from("balance_history").insert({
          telegram_id: o.telegram_id, admin_telegram_id: 0, amount, type: "credit",
          comment: `Возврат по заказу #${o.order_number}`, balance_after: Number(newBal ?? 0),
        });
        await writeAuditLog("order.refund", String(o.order_number), { amount });
        await tgSend(o.telegram_id, `↩По заказу #${o.order_number} возвращено ${amount.toFixed(2)}$ на ваш баланс.`, { parse_mode: "HTML" });
        return jsonRes({ ok: true });
      }
      case "orders.message": {
        const { id, text } = body;
        if (!id || !text) return jsonRes({ error: "id and text required" }, 400);
        const { data: o } = await supabase.from("orders").select("order_number, telegram_id").eq("id", id).maybeSingle();
        if (!o) return jsonRes({ error: "Заказ не найден" }, 404);
        const send = await tgSend(o.telegram_id, `<b>Сообщение по заказу #${o.order_number}:</b>\n\n${escapeHtml(String(text))}`, { parse_mode: "HTML" });
        await writeAuditLog("order.message", String(o.order_number), { ok: !!send?.ok });
        return jsonRes({ ok: !!send?.ok, description: send?.description });
      }

      // ===== PROMOCODES =====
      case "promocodes.list": {
        const { data, error } = await supabase.from("promocodes").select("*").order("is_active", { ascending: false }).order("code");
        if (error) throw error;
        return jsonRes({ data });
      }
      case "promocodes.upsert": {
        const { row } = body;
        if (!row?.code || !row?.discount_type) return jsonRes({ error: "code и discount_type обязательны" }, 400);
        const payload = { ...row, code: String(row.code).toUpperCase() };
        const { data, error } = await supabase.from("promocodes").upsert(payload).select().maybeSingle();
        if (error) throw error;
        await writeAuditLog(row.id ? "promo.update" : "promo.create", data?.id ?? null, { code: payload.code });
        return jsonRes({ data });
      }
      case "promocodes.toggle": {
        const { id } = body;
        if (!id) return jsonRes({ error: "id required" }, 400);
        const { data: p } = await supabase.from("promocodes").select("is_active").eq("id", id).maybeSingle();
        if (!p) return jsonRes({ error: "Промокод не найден" }, 404);
        const next = !p.is_active;
        await supabase.from("promocodes").update({ is_active: next }).eq("id", id);
        await writeAuditLog("promo.toggle", id, { is_active: next });
        return jsonRes({ ok: true, is_active: next });
      }
      case "promocodes.delete": {
        const { id } = body;
        if (!id) return jsonRes({ error: "id required" }, 400);
        await supabase.from("promocodes").delete().eq("id", id);
        await writeAuditLog("promo.delete", id, {});
        return jsonRes({ ok: true });
      }

      // ===== INVENTORY / WAREHOUSE =====
      case "inventory.products": {
        const page = Number(body.page ?? 0);
        const pageSize = Math.min(100, Number(body.pageSize ?? 20));
        const [from, to] = pageRange(page, pageSize);
        const { data: products, count, error } = await supabase
          .from("products").select("id, title, product_type", { count: "exact" }).order("title").range(from, to);
        if (error) throw error;
        const ids = (products ?? []).map((p) => p.id);
        const stats = new Map<string, { available: number; sold: number }>();
        if (ids.length) {
          const { data: items } = await supabase.from("inventory_items").select("product_id, status").in("product_id", ids);
          for (const it of items ?? []) {
            const s = stats.get(it.product_id as string) ?? { available: 0, sold: 0 };
            if (it.status === "available") s.available++;
            else if (it.status === "sold") s.sold++;
            stats.set(it.product_id as string, s);
          }
        }
        const data = (products ?? []).map((p) => ({ ...p, ...(stats.get(p.id) ?? { available: 0, sold: 0 }) }));
        return jsonRes({ data, total: count ?? 0, page, pageSize });
      }
      case "inventory.get": {
        const { productId } = body;
        if (!productId) return jsonRes({ error: "productId required" }, 400);
        const { data: product } = await supabase.from("products").select("id, title, product_type, stock").eq("id", productId).maybeSingle();
        if (!product) return jsonRes({ error: "Товар не найден" }, 404);
        const { data: items } = await supabase
          .from("inventory_items").select("id, status, content, created_at, sold_at")
          .eq("product_id", productId).order("created_at", { ascending: false }).limit(200);
        const available = (items ?? []).filter((i) => i.status === "available");
        const sold = (items ?? []).filter((i) => i.status === "sold");
        return jsonRes({ product, available, sold });
      }
      case "inventory.add": {
        const { productId, lines } = body;
        if (!productId || !Array.isArray(lines) || !lines.length) return jsonRes({ error: "productId и lines[] обязательны" }, 400);
        const rows = lines.map((content: string) => ({ product_id: productId, content: String(content), status: "available" }));
        const { error } = await supabase.from("inventory_items").insert(rows);
        if (error) throw error;
        await writeAuditLog("inventory.add", productId, { count: rows.length });
        return jsonRes({ ok: true, count: rows.length });
      }
      case "inventory.purge": {
        const { productId } = body;
        if (!productId) return jsonRes({ error: "productId required" }, 400);
        const { data, error } = await supabase.from("inventory_items").delete().eq("product_id", productId).eq("status", "available").select("id");
        if (error) throw error;
        await writeAuditLog("inventory.purge", productId, { count: data?.length ?? 0 });
        return jsonRes({ ok: true, count: data?.length ?? 0 });
      }
      case "inventory.deleteItem": {
        const { itemId } = body;
        if (!itemId) return jsonRes({ error: "itemId required" }, 400);
        const { error } = await supabase.from("inventory_items").delete().eq("id", itemId).eq("status", "available");
        if (error) throw error;
        await writeAuditLog("inventory.delete_item", itemId, {});
        return jsonRes({ ok: true });
      }

      // ===== MODERATORS =====
      case "moderators.list": {
        const { data, error } = await supabase.from("moderators").select("telegram_id, username, is_active, created_at").order("created_at", { ascending: false });
        if (error) throw error;
        return jsonRes({ data });
      }
      case "moderators.add": {
        const telegramId = Number(body.telegramId);
        if (!telegramId) return jsonRes({ error: "telegramId required" }, 400);
        const password = genPassword();
        const password_hash = await sha256Hex(password);
        let username: string | null = null;
        try {
          const { data: u } = await supabase.from("user_profiles").select("username").eq("telegram_id", telegramId).maybeSingle();
          username = u?.username ?? null;
        } catch { /* best-effort */ }
        const { error } = await supabase.from("moderators").upsert(
          { telegram_id: telegramId, username, password_hash, is_active: true, added_by: 0 },
          { onConflict: "telegram_id" },
        );
        if (error) return jsonRes({ error: error.message }, 400);
        const send = await tgSend(
          telegramId,
          `<b>Вы назначены модератором Hustlify</b>\n\nПароль от веб-админки: <code>${password}</code>\n\nНикому не сообщайте этот пароль.`,
          { parse_mode: "HTML" },
        );
        await writeAuditLog("moderator.add", String(telegramId), {});
        return jsonRes({ ok: true, password, delivered: !!send?.ok });
      }
      case "moderators.resetPassword": {
        const telegramId = Number(body.telegramId);
        if (!telegramId) return jsonRes({ error: "telegramId required" }, 400);
        const password = genPassword();
        const password_hash = await sha256Hex(password);
        const { error } = await supabase.from("moderators").update({ password_hash }).eq("telegram_id", telegramId);
        if (error) return jsonRes({ error: error.message }, 400);
        const send = await tgSend(
          telegramId,
          `<b>Ваш пароль от админ-панели обновлён</b>\n\nПароль: <code>${password}</code>\n\nНикому не сообщайте этот пароль.`,
          { parse_mode: "HTML" },
        );
        await writeAuditLog("moderator.reset_password", String(telegramId), {});
        return jsonRes({ ok: true, password, delivered: !!send?.ok });
      }
      case "moderators.toggle": {
        const telegramId = Number(body.telegramId);
        if (!telegramId) return jsonRes({ error: "telegramId required" }, 400);
        const { data: m } = await supabase.from("moderators").select("is_active").eq("telegram_id", telegramId).maybeSingle();
        if (!m) return jsonRes({ error: "Модератор не найден" }, 404);
        const next = !m.is_active;
        await supabase.from("moderators").update({ is_active: next }).eq("telegram_id", telegramId);
        await writeAuditLog("moderator.toggle", String(telegramId), { is_active: next });
        return jsonRes({ ok: true, is_active: next });
      }
      case "moderators.remove": {
        const telegramId = Number(body.telegramId);
        if (!telegramId) return jsonRes({ error: "telegramId required" }, 400);
        await supabase.from("moderators").delete().eq("telegram_id", telegramId);
        await writeAuditLog("moderator.remove", String(telegramId), {});
        return jsonRes({ ok: true });
      }

      // ===== LOGS (admin actions + balance history), used for the real-time log viewer =====
      case "logs.adminLog": {
        const page = Number(body.page ?? 0);
        const pageSize = Math.min(100, Number(body.pageSize ?? 20));
        const [from, to] = pageRange(page, pageSize);
        const { data, count, error } = await supabase
          .from("admin_log")
          .select("id, admin_telegram_id, action, target, meta, created_at", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        return jsonRes({ data, total: count ?? 0, page, pageSize });
      }
      case "logs.balanceHistory": {
        const page = Number(body.page ?? 0);
        const pageSize = Math.min(100, Number(body.pageSize ?? 20));
        const [from, to] = pageRange(page, pageSize);
        const { data, count, error } = await supabase
          .from("balance_history")
          .select("id, telegram_id, admin_telegram_id, type, amount, balance_after, comment, created_at", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        return jsonRes({ data, total: count ?? 0, page, pageSize });
      }

      // ===== STATISTICS (mirrors the bot's /admin → Статистика) =====
      case "stats.main": {
        const range = String(body.range ?? "w");
        const since = sinceFor(range);
        const orders = await fetchAll((from, to) => {
          let q = supabase.from("orders").select("total_amount, payment_status, status, created_at").range(from, to);
          if (since) q = q.gte("created_at", since);
          return q;
        });
        const ordersCount = orders.length;
        const paid = orders.filter((o) => o.payment_status === "paid");
        const revenue = paid.reduce((s, o) => s + Number(o.total_amount || 0), 0);
        const aov = paid.length ? revenue / paid.length : 0;
        const conv = ordersCount > 0 ? (paid.length / ordersCount) * 100 : 0;
        const byStatus: Record<string, number> = {};
        for (const o of orders) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;

        const users = await fetchAll((from, to) => supabase.from("user_profiles").select("telegram_id, balance, is_blocked, created_at").range(from, to));
        const usersTotal = users.length;
        const newUsers = since ? users.filter((u) => u.created_at >= since).length : usersTotal;
        const blocked = users.filter((u) => u.is_blocked).length;
        const totalBalance = users.reduce((s, u) => s + Number(u.balance || 0), 0);

        const { count: invAvail } = await supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("status", "available");
        const { count: invSold } = await supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("status", "sold");
        const { count: productsTotal } = await supabase.from("products").select("id", { count: "exact", head: true });
        const { count: productsActive } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true);
        const { count: reviewsPending } = await supabase.from("reviews").select("id", { count: "exact", head: true }).eq("moderation_status", "pending");

        return jsonRes({
          data: {
            ordersCount, paidCount: paid.length, revenue, aov, conv, byStatus,
            usersTotal, newUsers, blocked, totalBalance,
            invAvail: invAvail ?? 0, invSold: invSold ?? 0,
            productsTotal: productsTotal ?? 0, productsActive: productsActive ?? 0,
            reviewsPending: reviewsPending ?? 0,
          },
        });
      }
      case "stats.topProducts": {
        const range = String(body.range ?? "w");
        const since = sinceFor(range);
        const paidOrders = await fetchAll((from, to) => {
          let q = supabase.from("orders").select("id, payment_status, created_at").eq("payment_status", "paid").range(from, to);
          if (since) q = q.gte("created_at", since);
          return q;
        });
        const orderIds = paidOrders.map((o) => o.id);
        const agg = new Map<string, { title: string; qty: number; revenue: number }>();
        const CHUNK = 500;
        for (let i = 0; i < orderIds.length; i += CHUNK) {
          const chunkIds = orderIds.slice(i, i + CHUNK);
          const rows = await fetchAll((from, to) =>
            supabase.from("order_items").select("product_id, product_title, product_price, quantity").in("order_id", chunkIds).range(from, to));
          for (const it of rows) {
            const cur = agg.get(it.product_id) ?? { title: it.product_title, qty: 0, revenue: 0 };
            cur.qty += Number(it.quantity || 0);
            cur.revenue += Number(it.product_price || 0) * Number(it.quantity || 0);
            agg.set(it.product_id, cur);
          }
        }
        const top = [...agg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
        return jsonRes({ data: top });
      }
      case "stats.topBuyers": {
        const range = String(body.range ?? "w");
        const since = sinceFor(range);
        const paid = await fetchAll((from, to) => {
          let q = supabase.from("orders").select("telegram_id, total_amount, payment_status, created_at").eq("payment_status", "paid").range(from, to);
          if (since) q = q.gte("created_at", since);
          return q;
        });
        const agg = new Map<number, { tid: number; orders: number; revenue: number }>();
        for (const o of paid) {
          const tid = Number(o.telegram_id);
          const cur = agg.get(tid) ?? { tid, orders: 0, revenue: 0 };
          cur.orders += 1;
          cur.revenue += Number(o.total_amount || 0);
          agg.set(tid, cur);
        }
        const top = [...agg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
        let data: any[] = [];
        if (top.length) {
          const { data: profs } = await supabase.from("user_profiles").select("telegram_id, first_name, username").in("telegram_id", top.map((t) => t.tid));
          const pmap = new Map((profs ?? []).map((p) => [Number(p.telegram_id), p]));
          data = top.map((t) => ({ ...t, first_name: pmap.get(t.tid)?.first_name ?? null, username: pmap.get(t.tid)?.username ?? null }));
        }
        return jsonRes({ data });
      }
      case "stats.daily": {
        const range = String(body.range ?? "w");
        const days = STAT_RANGES[range] ?? 30;
        const since = new Date(Date.now() - days * 86400_000).toISOString();
        const orders = await fetchAll((from, to) =>
          supabase.from("orders").select("total_amount, payment_status, created_at").gte("created_at", since).range(from, to));
        const buckets = new Map<string, { all: number; paid: number; rev: number }>();
        for (let i = 0; i < days; i++) {
          const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
          buckets.set(d, { all: 0, paid: 0, rev: 0 });
        }
        for (const o of orders) {
          const d = (o.created_at as string).slice(0, 10);
          const b = buckets.get(d);
          if (!b) continue;
          b.all += 1;
          if (o.payment_status === "paid") { b.paid += 1; b.rev += Number(o.total_amount || 0); }
        }
        const data = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, b]) => ({ date, ...b }));
        return jsonRes({ data });
      }

      default:
        return jsonRes({ error: `Неизвестное действие: ${action}` }, 400);
    }
  } catch (e) {
    console.error("[admin-api] fatal", e);
    return jsonRes({ error: e?.message || "Internal error" }, 500);
  }
});
