/**
 * Real service layer — THE backend-swap seam.
 *
 * Every page/component reads the catalogue exclusively through the functions
 * below, never by querying InsForge directly. Each function fetches the
 * current `products` table via the InsForge SDK, maps rows to the `Product`
 * shape, then reuses the exact same filter/sort/search logic that ran over
 * the old in-memory mock — so behavior is unchanged and no page needed to
 * change when this file went from mock to real backend.
 */
import { insforge } from "./insforge";
import { CATEGORIES, type Product } from "./data";

export type SortOption = "featured" | "price-asc" | "price-desc" | "newest";

export interface GetProductsParams {
  category?: "women" | "men";
  subcategory?: string;
  sort?: SortOption;
  query?: string;
  limit?: number;
}

interface ProductRow {
  id: string;
  name: string;
  category: "women" | "men";
  subcategory: string;
  price: number;
  compare_at_price: number | null;
  description: string;
  sizes: string[];
  images: [string, string];
  featured: boolean;
  is_new: boolean;
  trending: boolean;
}

function mapRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price != null ? Number(row.compare_at_price) : undefined,
    description: row.description,
    sizes: row.sizes,
    images: row.images,
    featured: row.featured,
    isNew: row.is_new,
    trending: row.trending,
  };
}

async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await insforge.database.from("products").select();
  if (error) {
    console.error("Failed to fetch products:", error);
    return [];
  }
  return (data as ProductRow[]).map(mapRow);
}

function sortProducts(items: Product[], sort: SortOption = "featured"): Product[] {
  const list = [...items];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "newest":
      return list.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    case "featured":
    default:
      return list.sort((a, b) => Number(b.featured) - Number(a.featured));
  }
}

export async function getProducts(params: GetProductsParams = {}): Promise<Product[]> {
  const { category, subcategory, sort = "featured", query, limit } = params;

  let items = await fetchAllProducts();

  if (category) {
    items = items.filter((p) => p.category === category);
  }
  if (subcategory) {
    items = items.filter((p) => p.subcategory === subcategory);
  }
  if (query) {
    const q = query.trim().toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }

  items = sortProducts(items, sort);

  if (limit) {
    items = items.slice(0, limit);
  }

  return items;
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const { data, error } = await insforge.database
    .from("products")
    .select()
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return undefined;
  return mapRow(data as ProductRow);
}

export async function getFeatured(limit = 8): Promise<Product[]> {
  const items = await fetchAllProducts();
  return items.filter((p) => p.featured).slice(0, limit);
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  const items = await fetchAllProducts();
  return items.filter((p) => p.isNew).slice(0, limit);
}

export async function getTrending(limit = 8): Promise<Product[]> {
  const items = await fetchAllProducts();
  return items.filter((p) => p.trending).slice(0, limit);
}

export async function getRelated(id: string, limit = 4): Promise<Product[]> {
  const items = await fetchAllProducts();
  const product = items.find((p) => p.id === id);
  if (!product) return [];

  const sameSub = items.filter(
    (p) => p.id !== id && p.category === product.category && p.subcategory === product.subcategory
  );
  const sameCategory = items.filter(
    (p) => p.id !== id && p.category === product.category && p.subcategory !== product.subcategory
  );

  return [...sameSub, ...sameCategory].slice(0, limit);
}

export async function getSubcategories(category: "women" | "men"): Promise<string[]> {
  const items = await fetchAllProducts();
  const active = new Set(
    items.filter((p) => p.category === category).map((p) => p.subcategory)
  );
  const curated = CATEGORIES[category].filter((sub) => active.has(sub));
  const extra = [...active].filter((sub) => !CATEGORIES[category].includes(sub));
  return [...curated, ...extra];
}
