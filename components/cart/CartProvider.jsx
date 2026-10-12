"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiFetch } from "@/lib/api";
import {
  addToCart,
  getCart,
  getProductById,
  removeCartItem,
  updateCartItem,
} from "@/lib/endpoints";
import { useAuth } from "@/hooks/useAuth";

const CartContext = createContext({
  cart: null,
  items: [],
  count: 0,
  subtotal: 0,
  status: "idle",
  error: null,
  addItem: async () => {},
  updateQty: async () => {},
  removeItem: async () => {},
  refresh: async () => {},
  clearLocal: () => {},
});

function lineId(line) {
  const pid = line.productId;
  return typeof pid === "string" ? pid : pid?._id || null;
}

export function CartProvider({ children }) {
  const { status: authStatus } = useAuth();
  const [cart, setCart] = useState(null);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  // TODO Q9: N+1 — per-item product fetch, cached by id below. Revisit if a
  // populate/expand query param ships on GET /carts.
  const productCache = useRef(new Map());

  const resolveItems = useCallback(async (lines) => {
    const resolved = await Promise.all(
      lines.map(async (line) => {
        const id = lineId(line);
        if (!id) return { ...line, productId: null, product: null };
        // A populated productId object doubles as the product itself.
        if (line.productId && typeof line.productId === "object" && line.productId.title) {
          productCache.current.set(id, line.productId);
          return { ...line, productId: id, product: line.productId };
        }
        if (productCache.current.has(id)) {
          return { ...line, productId: id, product: productCache.current.get(id) };
        }
        try {
          const res = await apiFetch(getProductById(id), { auth: true });
          const product = res?.data || null;
          productCache.current.set(id, product);
          return { ...line, productId: id, product };
        } catch {
          // One bad line must not fail the whole cart — render gracefully.
          productCache.current.set(id, null);
          return { ...line, productId: id, product: null };
        }
      })
    );
    return resolved;
  }, []);

  const refresh = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) {
        setStatus("loading");
        setError(null);
      }
      try {
        const res = await apiFetch(getCart(), { auth: true });
        const lines = Array.isArray(res?.data?.products) ? res.data.products : [];
        setCart(res?.data || null);
        setItems(await resolveItems(lines));
        setStatus("ready");
        if (!quiet) setError(null);
        return { ok: true };
      } catch (err) {
        // 401/403 never settles here for long — apiFetch clears the session
        // and redirects to /login?next=<current> first.
        if (!quiet) {
          setError(err);
          setStatus("error");
        }
        return { ok: false, error: err };
      }
    },
    [resolveItems]
  );

  const clearLocal = useCallback(() => {
    setCart(null);
    setItems([]);
    setStatus("idle");
    setError(null);
  }, []);

  // Own the lifecycle off auth transitions only (no fetch on 'loading').
  useEffect(() => {
    if (authStatus === "user") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- transition fetch (sanctioned; resolutions are async)
      refresh();
    } else if (authStatus === "guest") {
      clearLocal();
    }
    return undefined;
  }, [authStatus, refresh, clearLocal]);

  const addItem = useCallback(
    async (productId, quantity = 1) => {
      try {
        // Backend response is authoritative (it may merge quantities) — no
        // optimistic count bump; refresh to sync server math.
        await apiFetch(addToCart(productId), {
          method: "POST",
          body: { quantity },
          auth: true,
        });
        await refresh({ quiet: true });
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err };
      }
    },
    [refresh]
  );

  const removeItem = useCallback(
    async (productId) => {
      const snapshot = items;
      setItems((prev) => prev.filter((it) => it.productId !== productId));
      try {
        await apiFetch(removeCartItem(productId), {
          method: "PATCH",
          auth: true,
        });
        await refresh({ quiet: true });
        return { ok: true };
      } catch (err) {
        setItems(snapshot);
        return { ok: false, error: err };
      }
    },
    [items, refresh]
  );

  const updateQty = useCallback(
    async (productId, quantity) => {
      if (quantity <= 0) {
        // Never send 0 — removal is a separate endpoint.
        return removeItem(productId);
      }
      const snapshot = items;
      setItems((prev) =>
        prev.map((it) => (it.productId === productId ? { ...it, quantity } : it))
      );
      try {
        await apiFetch(updateCartItem(productId), {
          method: "PATCH",
          body: { quantity },
          auth: true,
        });
        await refresh({ quiet: true });
        return { ok: true };
      } catch (err) {
        setItems(snapshot);
        return { ok: false, error: err };
      }
    },
    [items, refresh, removeItem]
  );

  const count = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0),
    [items]
  );
  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
        0
      ),
    [items]
  );

  const value = useMemo(
    () => ({
      cart,
      items,
      count,
      subtotal,
      status,
      error,
      addItem,
      updateQty,
      removeItem,
      refresh,
      clearLocal,
    }),
    [cart, items, count, subtotal, status, error, addItem, updateQty, removeItem, refresh, clearLocal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
