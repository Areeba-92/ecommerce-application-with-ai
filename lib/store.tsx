"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { insforge, getCurrentUserOnce, AUTH_CHANGED_EVENT } from "./insforge";

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  size: string;
  price: number;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (productId: string, size: string) => void;
  updateQty: (productId: string, size: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "velour-cart";

interface CartRow {
  product_id: string;
  size: string;
  quantity: number;
  products: { name: string; images: [string, string]; price: number };
}

async function loadCartFromDb(userId: string): Promise<CartItem[]> {
  const { data, error } = await insforge.database
    .from("carts")
    .select("*, products(name, images, price)")
    .eq("user_id", userId);
  if (error || !data) return [];
  return (data as CartRow[]).map((row) => ({
    productId: row.product_id,
    name: row.products.name,
    image: row.products.images[0],
    size: row.size,
    price: row.products.price,
    qty: row.quantity,
  }));
}

async function dbAdd(userId: string, item: Omit<CartItem, "qty">, qty: number) {
  const { data } = await insforge.database
    .from("carts")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("product_id", item.productId)
    .eq("size", item.size)
    .maybeSingle();

  if (data) {
    await insforge.database
      .from("carts")
      .update({ quantity: data.quantity + qty, updated_at: new Date().toISOString() })
      .eq("id", data.id);
  } else {
    await insforge.database.from("carts").insert([
      {
        user_id: userId,
        product_id: item.productId,
        size: item.size,
        quantity: qty,
      },
    ]);
  }
}

async function dbRemove(userId: string, productId: string, size: string) {
  await insforge.database
    .from("carts")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("size", size);
}

async function dbUpdateQty(userId: string, productId: string, size: string, qty: number) {
  await insforge.database
    .from("carts")
    .update({ quantity: qty, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("size", size);
}

async function dbClear(userId: string) {
  await insforge.database.from("carts").delete().eq("user_id", userId);
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Always starts empty on both server and first client render so the SSR'd
  // cart badge can never mismatch the client — real contents are read from
  // localStorage (guests) or the `carts` table (signed-in users) inside the
  // effect below, which only runs post-hydration.
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const loadForCurrentUser = useCallback(async () => {
    const { data } = await getCurrentUserOnce();
    const userId = data.user?.id ?? null;

    if (userId) {
      setItems(await loadCartFromDb(userId));
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setItems(raw ? JSON.parse(raw) : []);
      } catch {
        setItems([]);
      }
    }
  }, []);

  useEffect(() => {
    loadForCurrentUser().finally(() => setHydrated(true));

    window.addEventListener(AUTH_CHANGED_EVENT, loadForCurrentUser);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, loadForCurrentUser);
  }, [loadForCurrentUser]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.productId === item.productId && i.size === item.size
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { ...item, qty }];
    });
    getCurrentUserOnce().then(({ data }) => {
      if (data.user) void dbAdd(data.user.id, item, qty);
    });
  }, []);

  const remove = useCallback((productId: string, size: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.size === size))
    );
    getCurrentUserOnce().then(({ data }) => {
      if (data.user) void dbRemove(data.user.id, productId, size);
    });
  }, []);

  const updateQty = useCallback(
    (productId: string, size: string, qty: number) => {
      const nextQty = Math.max(1, qty);
      setItems((prev) =>
        prev.map((i) =>
          i.productId === productId && i.size === size
            ? { ...i, qty: nextQty }
            : i
        )
      );
      getCurrentUserOnce().then(({ data }) => {
        if (data.user) void dbUpdateQty(data.user.id, productId, size, nextQty);
      });
    },
    []
  );

  const clear = useCallback(() => {
    setItems([]);
    getCurrentUserOnce().then(({ data }) => {
      if (data.user) void dbClear(data.user.id);
    });
  }, []);

  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, add, remove, updateQty, clear, count, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
