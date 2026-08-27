// Thin client for the `admin-api` edge function that powers /admin.
// Session token is kept in localStorage so the panel survives page reloads.

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;
const TOKEN_KEY = 'admin_session_token';

export const adminAuth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),
};

class AdminApiError extends Error {}

async function call<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const token = adminAuth.getToken();
  const res = await fetch(FUNCTIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    if (res.status === 401) adminAuth.clearToken();
    throw new AdminApiError(data?.error || `Ошибка запроса (${res.status})`);
  }
  return data as T;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

export const adminApi = {
  uploadFile: async (file: File, folder?: string): Promise<string> => {
    if (file.size > 8 * 1024 * 1024) {
      throw new AdminApiError('Файл слишком большой (максимум 8 МБ)');
    }
    const fileBase64 = await fileToBase64(file);
    const { url } = await call<{ url: string }>('storage.upload', {
      fileBase64,
      fileName: file.name,
      contentType: file.type,
      folder,
    });
    return url;
  },
  login: async (password: string) => {
    const { token } = await call<{ token: string }>('login', { password });
    adminAuth.setToken(token);
  },
  logout: () => adminAuth.clearToken(),

  cases: {
    list: () => call<{ data: any[] }>('cases.list').then((r) => r.data),
    upsert: (row: any) => call<{ data: any }>('cases.upsert', { row }).then((r) => r.data),
    remove: (id: string) => call('cases.delete', { id }),
  },
  categories: {
    list: () => call<{ data: any[] }>('categories.list').then((r) => r.data),
    upsert: (row: any) => call<{ data: any }>('categories.upsert', { row }).then((r) => r.data),
    remove: (id: string) => call('categories.delete', { id }),
  },
  projects: {
    list: () => call<{ data: any[] }>('projects.list').then((r) => r.data),
    upsert: (row: any) => call<{ data: any }>('projects.upsert', { row }).then((r) => r.data),
    remove: (id: string) => call('projects.delete', { id }),
  },
  products: {
    list: () => call<{ data: any[] }>('products.list').then((r) => r.data),
    upsert: (row: any) => call<{ data: any }>('products.upsert', { row }).then((r) => r.data),
    remove: (id: string) => call('products.delete', { id }),
  },
  reviews: {
    list: () => call<{ data: any[] }>('reviews.list').then((r) => r.data),
    setStatus: (id: string, status: 'approved' | 'rejected' | 'pending') =>
      call('reviews.setStatus', { id, status }),
    update: (id: string, row: any) => call('reviews.update', { id, row }),
    remove: (id: string) => call('reviews.delete', { id }),
  },
  settings: {
    list: () => call<{ data: { key: string; value: string }[] }>('settings.list').then((r) => r.data),
    set: (key: string, value: string) => call('settings.set', { key, value }),
  },

  users: {
    list: (page: number, pageSize = 20, search = '') =>
      call<{ data: any[]; total: number }>('users.list', { page, pageSize, search }),
    get: (telegramId: number) => call<{ user: any; ordersCount: number }>('users.get', { telegramId }),
    setBalance: (telegramId: number, dir: 'credit' | 'deduct', amount: number, comment?: string) =>
      call<{ ok: true; balance: number }>('users.setBalance', { telegramId, dir, amount, comment }),
    balanceHistory: (telegramId: number, page: number, pageSize = 20) =>
      call<{ data: any[]; total: number }>('users.balanceHistory', { telegramId, page, pageSize }),
    toggleBlock: (telegramId: number) => call<{ ok: true; is_blocked: boolean }>('users.toggleBlock', { telegramId }),
    setNote: (telegramId: number, note: string) => call('users.setNote', { telegramId, note }),
  },

  orders: {
    list: (filter: string, page: number, pageSize = 20) =>
      call<{ data: any[]; total: number }>('orders.list', { filter, page, pageSize }),
    get: (id: string) => call<{ order: any; items: any[]; user: any }>('orders.get', { id }),
    setStatus: (id: string, status: string) => call('orders.setStatus', { id, status }),
    setPayment: (id: string, status: string) => call('orders.setPayment', { id, status }),
    refund: (id: string) => call('orders.refund', { id }),
    message: (id: string, text: string) => call<{ ok: boolean; description?: string }>('orders.message', { id, text }),
  },

  promocodes: {
    list: () => call<{ data: any[] }>('promocodes.list').then((r) => r.data),
    upsert: (row: any) => call<{ data: any }>('promocodes.upsert', { row }).then((r) => r.data),
    toggle: (id: string) => call<{ ok: true; is_active: boolean }>('promocodes.toggle', { id }),
    remove: (id: string) => call('promocodes.delete', { id }),
  },

  inventory: {
    products: (page: number, pageSize = 20) =>
      call<{ data: any[]; total: number }>('inventory.products', { page, pageSize }),
    get: (productId: string) => call<{ product: any; available: any[]; sold: any[] }>('inventory.get', { productId }),
    add: (productId: string, lines: string[]) => call<{ ok: true; count: number }>('inventory.add', { productId, lines }),
    purge: (productId: string) => call<{ ok: true; count: number }>('inventory.purge', { productId }),
    deleteItem: (itemId: string) => call('inventory.deleteItem', { itemId }),
  },

  moderators: {
    list: () => call<{ data: any[] }>('moderators.list').then((r) => r.data),
    add: (telegramId: number) => call<{ ok: true; password: string; delivered: boolean }>('moderators.add', { telegramId }),
    resetPassword: (telegramId: number) =>
      call<{ ok: true; password: string; delivered: boolean }>('moderators.resetPassword', { telegramId }),
    toggle: (telegramId: number) => call<{ ok: true; is_active: boolean }>('moderators.toggle', { telegramId }),
    remove: (telegramId: number) => call('moderators.remove', { telegramId }),
  },

  logs: {
    adminLog: (page: number, pageSize = 20) => call<{ data: any[]; total: number }>('logs.adminLog', { page, pageSize }),
    balanceHistory: (page: number, pageSize = 20) =>
      call<{ data: any[]; total: number }>('logs.balanceHistory', { page, pageSize }),
  },

  stats: {
    main: (range: string) => call<{ data: any }>('stats.main', { range }).then((r) => r.data),
    topProducts: (range: string) => call<{ data: any[] }>('stats.topProducts', { range }).then((r) => r.data),
    topBuyers: (range: string) => call<{ data: any[] }>('stats.topBuyers', { range }).then((r) => r.data),
    daily: (range: string) => call<{ data: any[] }>('stats.daily', { range }).then((r) => r.data),
  },
};

export { AdminApiError };
