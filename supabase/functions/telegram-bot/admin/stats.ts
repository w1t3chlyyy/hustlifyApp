// Statistics dashboard: main / top products / top buyers / daily dynamics.
import { deleteAndSend } from "../_shared/tg.ts";
import { supabase } from "../_shared/db.ts";

function backMenu() { return [{ text: "← Меню", callback_data: "a:menu" }]; }
function fmt(n: number) { return (n || 0).toLocaleString("ru-RU"); }
function money(n: number) { return `$${(n || 0).toFixed(2)}`; }

const RANGES: Record<string, { label: string; days: number | null }> = {
d: { label: "24 часа", days: 1 },
w: { label: "7 дней", days: 7 },
m: { label: "30 дней", days: 30 },
all: { label: "Всё время", days: null },
};

// Supabase caps any single .select() at 1000 rows by default. For stats we
// need the TRUE totals, not a 1000-row sample, so page through with .range()
// until a page comes back short.
async function fetchAll<T = any>(
build: (from: number, to: number) => any,
pageSize = 1000,
): Promise<T[]> {
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

function rangeButtons(view: string, range: string) {
return Object.entries(RANGES).map(([k, v]) => ({
  text: (range === k ? "• " : "") + v.label,
  callback_data: `a:st:v:${view}:${k}`,
}));
}

function viewTabs(active: string, range: string) {
const tabs: Array<[string, string]> = [
  ["mn", "Свод"],
  ["tp", "Топ товаров"],
  ["tb", "Топ покупателей"],
  ["dy", "По дням"],
];
return tabs.map(([v, label]) => ({
  text: (active === v ? "• " : "") + label,
  callback_data: `a:st:v:${v}:${range}`,
}));
}

function navKeyboard(view: string, range: string) {
return {
  inline_keyboard: [
    viewTabs(view, range),
    rangeButtons(view, range),
    [{ text: "Обновить", callback_data: `a:st:v:${view}:${range}` }],
    backMenu(),
  ],
};
}

// ────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────
async function showMain(chatId: number, msgId: number | undefined, range: string) {
const r = RANGES[range] ?? RANGES.w;
const since = r.days ? new Date(Date.now() - r.days * 86400_000).toISOString() : null;

const orders = await fetchAll((from, to) => {
  let q = supabase
    .from("orders")
    .select("total_amount, payment_status, status, created_at")
    .range(from, to);
  if (since) q = q.gte("created_at", since);
  return q;
});
const ordersCount = orders.length;

const paid = orders.filter((o) => o.payment_status === "paid");
const revenue = paid.reduce((s, o) => s + Number(o.total_amount || 0), 0);
const aov = paid.length ? revenue / paid.length : 0;
const conv = ordersCount > 0 ? (paid.length / ordersCount) * 100 : 0;

const byStatus = new Map<string, number>();
for (const o of orders) byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
const statusLine = Array.from(byStatus.entries())
  .map(([s, n]) => `<code>${s}</code>: ${n}`).join(" · ") || "—";

const users = await fetchAll((from, to) =>
  supabase
    .from("user_profiles")
    .select("telegram_id, balance, is_blocked, created_at")
    .range(from, to),
);
const usersTotal = users.length;
const newUsers = since ? users.filter((u) => u.created_at >= since).length : usersTotal;
const blocked = users.filter((u) => u.is_blocked).length;
const totalBalance = users.reduce((s, u) => s + Number(u.balance || 0), 0);

const { count: invAvail } = await supabase
  .from("inventory_items").select("id", { count: "exact", head: true }).eq("status", "available");
const { count: invSold } = await supabase
  .from("inventory_items").select("id", { count: "exact", head: true }).eq("status", "sold");

const { count: productsTotal } = await supabase
  .from("products").select("id", { count: "exact", head: true });
const { count: productsActive } = await supabase
  .from("products").select("id", { count: "exact", head: true }).eq("is_active", true);

const { count: reviewsPending } = await supabase
  .from("reviews").select("id", { count: "exact", head: true }).eq("moderation_status", "pending");

const txt = [
  `<b>Статистика — ${r.label}</b>`,
  ``,
  `<b>Заказы</b>`,
  `Всего: <b>${fmt(ordersCount)}</b> · Оплачено: <b>${fmt(paid.length)}</b> · Конверсия: <b>${conv.toFixed(1)}%</b>`,
  `Выручка: <b>${money(revenue)}</b> · Средний чек: <b>${money(aov)}</b>`,
  `Статусы: ${statusLine}`,
  ``,
  `<b>Пользователи</b>`,
  `Всего: <b>${fmt(usersTotal)}</b> · Новых за период: <b>${fmt(newUsers)}</b>`,
  `Заблокировано: <b>${fmt(blocked)}</b> · Баланс на счетах: <b>${money(totalBalance)}</b>`,
  ``,
  `<b>Каталог</b>`,
  `Товаров: <b>${fmt(productsTotal ?? 0)}</b> (активных: <b>${fmt(productsActive ?? 0)}</b>)`,
  `Склад: доступно <b>${fmt(invAvail ?? 0)}</b> · продано <b>${fmt(invSold ?? 0)}</b>`,
  ``,
  `Отзывов на модерации: <b>${fmt(reviewsPending ?? 0)}</b>`,
].join("\n");

await deleteAndSend(chatId, msgId, {
  text: txt,
  parse_mode: "HTML",
  reply_markup: navKeyboard("mn", range),
});
}

// ────────────────────────────────────────────────────────────
// TOP PRODUCTS
// ────────────────────────────────────────────────────────────
async function showTopProducts(chatId: number, msgId: number | undefined, range: string) {
const r = RANGES[range] ?? RANGES.w;
const since = r.days ? new Date(Date.now() - r.days * 86400_000).toISOString() : null;

const paidOrders = await fetchAll((from, to) => {
  let q = supabase
    .from("orders")
    .select("id, payment_status, created_at")
    .eq("payment_status", "paid")
    .range(from, to);
  if (since) q = q.gte("created_at", since);
  return q;
});
const orderIds = paidOrders.map((o) => o.id);

let lines: string[] = [];
if (!orderIds.length) {
  lines = ["—"];
} else {
  // order_items is fetched per-order-id batch too, since `.in()` combined
  // with a large orderIds list can also exceed the row cap.
  const items: any[] = [];
  const CHUNK = 500;
  for (let i = 0; i < orderIds.length; i += CHUNK) {
    const chunkIds = orderIds.slice(i, i + CHUNK);
    const rows = await fetchAll((from, to) =>
      supabase
        .from("order_items")
        .select("product_id, product_title, product_price, quantity")
        .in("order_id", chunkIds)
        .range(from, to),
    );
    items.push(...rows);
  }

  const agg = new Map<string, { title: string; qty: number; revenue: number }>();
  for (const it of items) {
    const key = it.product_id;
    const cur = agg.get(key) ?? { title: it.product_title, qty: 0, revenue: 0 };
    cur.qty += Number(it.quantity || 0);
    cur.revenue += Number(it.product_price || 0) * Number(it.quantity || 0);
    agg.set(key, cur);
  }
  const top = [...agg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  lines = top.length
    ? top.map((t, i) => `<b>${i + 1}.</b> ${t.title.slice(0, 40)}\n <b>${money(t.revenue)}</b> · ${fmt(t.qty)} шт.`)
    : ["—"];
}

const txt = [`<b>Топ товаров — ${r.label}</b>`, ``, ...lines].join("\n");
await deleteAndSend(chatId, msgId, {
  text: txt,
  parse_mode: "HTML",
  reply_markup: navKeyboard("tp", range),
});
}

// ────────────────────────────────────────────────────────────
// TOP BUYERS
// ────────────────────────────────────────────────────────────
async function showTopBuyers(chatId: number, msgId: number | undefined, range: string) {
const r = RANGES[range] ?? RANGES.w;
const since = r.days ? new Date(Date.now() - r.days * 86400_000).toISOString() : null;

const paid = await fetchAll((from, to) => {
  let q = supabase
    .from("orders")
    .select("telegram_id, total_amount, payment_status, created_at")
    .eq("payment_status", "paid")
    .range(from, to);
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

let lines: string[] = ["—"];
if (top.length) {
  const { data: profs } = await supabase
    .from("user_profiles")
    .select("telegram_id, first_name, username")
    .in("telegram_id", top.map((t) => t.tid));
  const pmap = new Map((profs ?? []).map((p) => [Number(p.telegram_id), p]));
  lines = top.map((t, i) => {
    const p = pmap.get(t.tid);
    const name = p?.username ? `@${p.username}` : (p?.first_name || String(t.tid));
    return `<b>${i + 1}.</b> ${name} <code>${t.tid}</code>\n <b>${money(t.revenue)}</b> · ${fmt(t.orders)} заказ(ов)`;
  });
}

const txt = [`<b>Топ покупателей — ${r.label}</b>`, ``, ...lines].join("\n");
await deleteAndSend(chatId, msgId, {
  text: txt,
  parse_mode: "HTML",
  reply_markup: navKeyboard("tb", range),
});
}

// ────────────────────────────────────────────────────────────
// DAILY DYNAMICS
// ────────────────────────────────────────────────────────────
async function showDaily(chatId: number, msgId: number | undefined, range: string) {
const r = RANGES[range] ?? RANGES.w;
const days = r.days ?? 30; // for "all" — show last 30 days
const since = new Date(Date.now() - days * 86400_000).toISOString();

const orders = await fetchAll((from, to) =>
  supabase
    .from("orders")
    .select("total_amount, payment_status, created_at")
    .gte("created_at", since)
    .range(from, to),
);

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
  if (o.payment_status === "paid") {
    b.paid += 1;
    b.rev += Number(o.total_amount || 0);
  }
}

const entries = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const maxRev = Math.max(1, ...entries.map(([, b]) => b.rev));

const rows = entries.slice(-Math.min(days, 30)).map(([d, b]) => {
  const blocks = Math.round((b.rev / maxRev) * 12);
  const bar = "█".repeat(blocks) + "░".repeat(12 - blocks);
  const md = d.slice(5);
  return `<code>${md}</code> ${bar} ${money(b.rev)} · ${b.paid}/${b.all}`;
});

const totalRev = entries.reduce((s, [, b]) => s + b.rev, 0);
const totalPaid = entries.reduce((s, [, b]) => s + b.paid, 0);
const totalAll = entries.reduce((s, [, b]) => s + b.all, 0);

const txt = [
  `<b>Динамика по дням — последние ${days}</b>`,
  ``,
  `Выручка: <b>${money(totalRev)}</b> · Оплачено: <b>${fmt(totalPaid)}</b>/<b>${fmt(totalAll)}</b>`,
  ``,
  "<code>дата</code> график выручка оплач/всего",
  ...rows,
].join("\n");

await deleteAndSend(chatId, msgId, {
  text: txt,
  parse_mode: "HTML",
  reply_markup: navKeyboard("dy", range),
});
}

// ────────────────────────────────────────────────────────────
// ENTRY
// ────────────────────────────────────────────────────────────
export async function showStats(chatId: number, msgId: number | undefined, range = "w", view = "mn") {
if (view === "tp") return showTopProducts(chatId, msgId, range);
if (view === "tb") return showTopBuyers(chatId, msgId, range);
if (view === "dy") return showDaily(chatId, msgId, range);
return showMain(chatId, msgId, range);
}
