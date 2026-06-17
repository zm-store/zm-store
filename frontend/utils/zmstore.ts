import { apiGet, apiPost, apiPatch, apiDelete, authenticatedGet, authenticatedPost, authenticatedPatch, authenticatedDelete } from '@/utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Me {
  id: string;
  email: string;
  name: string;
  image?: string;
  is_admin: boolean;
  last_phone?: string | null;
  last_address?: string | null;
  points_balance: number;
}

export interface CheckoutDefaults {
  phone: string | null;
  address: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name_ku: string;
  name_en: string;
  sort_order: number;
  image_url?: string;
}

export interface Banner {
  id: string;
  image_url: string;
  title?: string;
  link_url?: string;
  sort_order: number;
  active: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  category_slug?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  in_stock: boolean;
  created_at: string;
  video_url?: string | null;
  points_per_purchase: number;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image_url?: string;
  unit_price: number;
  quantity: number;
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'picked_up' | 'delivered' | 'rejected' | 'completed' | 'cancelled';

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  created_at: string;
}

export interface AppSettings {
  delivery_fee: number;
  service_fee: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  total: number;
  customer_name: string;
  customer_phone?: string;
  delivery_address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  status_history?: OrderStatusHistoryEntry[];
}

export interface CreateOrderBody {
  customer_phone?: string;
  delivery_address?: string;
  notes?: string;
  items: { product_id: string; quantity: number }[];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  console.log('[API] GET /api/settings');
  return apiGet('/api/settings');
}

export async function getMe(): Promise<Me> {
  console.log('[API] GET /api/me');
  return authenticatedGet('/api/me');
}

export async function updateMe(body: { name?: string; image?: string }): Promise<Me> {
  console.log('[API] PATCH /api/me', { ...body, image: body.image ? '[data]' : body.image });
  return authenticatedPatch('/api/me', body);
}

export async function getCheckoutDefaults(): Promise<CheckoutDefaults> {
  console.log('[API] GET /api/me/checkout-defaults');
  return authenticatedGet('/api/me/checkout-defaults');
}

export async function listCategories(): Promise<Category[]> {
  console.log('[API] GET /api/categories');
  return apiGet('/api/categories');
}

export async function listBanners(): Promise<Banner[]> {
  console.log('[API] GET /api/banners');
  return apiGet('/api/banners');
}

export async function listProducts(slug?: string): Promise<Product[]> {
  const url = slug ? `/api/products?category=${slug}` : '/api/products';
  console.log(`[API] GET ${url}`);
  return apiGet(url);
}

export async function getProduct(id: string): Promise<Product> {
  console.log(`[API] GET /api/products/${id}`);
  return apiGet(`/api/products/${id}`);
}

export async function listMyOrders(): Promise<Order[]> {
  console.log('[API] GET /api/orders');
  return authenticatedGet('/api/orders');
}

export async function getMyOrder(id: string): Promise<Order> {
  console.log(`[API] GET /api/orders/${id}`);
  return authenticatedGet(`/api/orders/${id}`);
}

export async function createOrder(body: CreateOrderBody): Promise<Order> {
  console.log('[API] POST /api/orders', body);
  return authenticatedPost('/api/orders', body);
}

export async function deleteMe(): Promise<void> {
  console.log('[API] DELETE /api/me');
  return authenticatedDelete('/api/me');
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export async function adminListBanners(): Promise<Banner[]> {
  console.log('[API] GET /api/admin/banners');
  return authenticatedGet('/api/admin/banners');
}

export async function adminCreateBanner(body: Partial<Banner>): Promise<Banner> {
  console.log('[API] POST /api/admin/banners', body);
  return authenticatedPost('/api/admin/banners', body);
}

export async function adminUpdateBanner(id: string, body: Partial<Banner>): Promise<Banner> {
  console.log(`[API] PATCH /api/admin/banners/${id}`, body);
  return authenticatedPatch(`/api/admin/banners/${id}`, body);
}

export async function adminDeleteBanner(id: string): Promise<void> {
  console.log(`[API] DELETE /api/admin/banners/${id}`);
  return authenticatedDelete(`/api/admin/banners/${id}`);
}

export async function adminListProducts(): Promise<Product[]> {
  console.log('[API] GET /api/admin/products (all)');
  return apiGet('/api/products');
}

export async function adminCreateProduct(body: Partial<Product>): Promise<Product> {
  console.log('[API] POST /api/admin/products', body);
  return authenticatedPost('/api/admin/products', body);
}

export async function adminUpdateProduct(id: string, body: Partial<Product>): Promise<Product> {
  console.log(`[API] PATCH /api/admin/products/${id}`, body);
  return authenticatedPatch(`/api/admin/products/${id}`, body);
}

export async function adminDeleteProduct(id: string): Promise<void> {
  console.log(`[API] DELETE /api/admin/products/${id}`);
  return authenticatedDelete(`/api/admin/products/${id}`);
}

export async function adminListOrders(status?: string): Promise<Order[]> {
  const url = status ? `/api/admin/orders?status=${status}` : '/api/admin/orders';
  console.log(`[API] GET ${url}`);
  return authenticatedGet(url);
}

export async function adminGetOrder(id: string): Promise<Order> {
  console.log(`[API] GET /api/admin/orders/${id}`);
  return authenticatedGet(`/api/admin/orders/${id}`);
}

export async function adminUpdateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  console.log(`[API] PATCH /api/admin/orders/${id}`, { status });
  return authenticatedPatch(`/api/admin/orders/${id}`, { status });
}

// ─── Admin Settings API ───────────────────────────────────────────────────────

export async function adminGetSettings(): Promise<AppSettings> {
  console.log('[API] GET /api/admin/settings');
  return authenticatedGet('/api/admin/settings');
}

export async function adminUpdateSettings(body: Partial<AppSettings>): Promise<AppSettings> {
  console.log('[API] PATCH /api/admin/settings', body);
  return authenticatedPatch('/api/admin/settings', body);
}

export async function adminGetPendingOrderCount(): Promise<{ count: number }> {
  console.log('[API] GET /api/admin/orders/pending-count');
  return authenticatedGet('/api/admin/orders/pending-count');
}

// ─── Admin Category API ───────────────────────────────────────────────────────

export async function adminListCategories(): Promise<Category[]> {
  console.log('[API] GET /api/admin/categories');
  return authenticatedGet('/api/admin/categories');
}

export async function adminCreateCategory(body: Partial<Category>): Promise<Category> {
  console.log('[API] POST /api/admin/categories', body);
  return authenticatedPost('/api/admin/categories', body);
}

export async function adminUpdateCategory(id: string, body: Partial<Category>): Promise<Category> {
  console.log(`[API] PATCH /api/admin/categories/${id}`, body);
  return authenticatedPatch(`/api/admin/categories/${id}`, body);
}

export async function adminDeleteCategory(id: string): Promise<void> {
  console.log(`[API] DELETE /api/admin/categories/${id}`);
  return authenticatedDelete(`/api/admin/categories/${id}`);
}
