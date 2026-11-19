// Zustand store for HustleCart Kesses client state.
// Holds the session, current view, cart, and the active order id (for tracking).
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  shopName: string;
  quantity: number;
};

export type View = "shop" | "orders" | "tracking" | "operator";

type Session = {
  id: string;
  phone: string;
  name: string;
  role: "shopper" | "operator";
} | null;

type AppState = {
  // session (kept in memory, but also mirrored to persist so refresh works
  // before /api/session resolves)
  session: Session;
  setSession: (s: Session) => void;
  clearSession: () => void;

  // view switching within the single page
  view: View;
  setView: (v: View) => void;

  // cart
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  updateQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  // cart drawer open state
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;

  // quick-order dialog open state
  quickOrderOpen: boolean;
  setQuickOrderOpen: (open: boolean) => void;

  // active order for tracking view
  activeOrderId: string | null;
  setActiveOrderId: (id: string | null) => void;

  // auth mode: null = landing screen, "shopper" or "operator" = which login flow
  authMode: "shopper" | "operator" | null;
  setAuthMode: (mode: "shopper" | "operator" | null) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (s) => set({ session: s }),
      clearSession: () => set({ session: null, cart: [], view: "shop" }),

      view: "shop",
      setView: (v) => set({ view: v }),

      cart: [],
      addToCart: (item, qty = 1) =>
        set((state) => {
          const existing = state.cart.find((c) => c.productId === item.productId);
          if (existing) {
            return {
              cart: state.cart.map((c) =>
                c.productId === item.productId
                  ? { ...c, quantity: c.quantity + qty }
                  : c
              ),
            };
          }
          return { cart: [...state.cart, { ...item, quantity: qty }] };
        }),
      updateQty: (productId, qty) =>
        set((state) => ({
          cart:
            qty <= 0
              ? state.cart.filter((c) => c.productId !== productId)
              : state.cart.map((c) =>
                  c.productId === productId ? { ...c, quantity: qty } : c
                ),
        })),
      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((c) => c.productId !== productId),
        })),
      clearCart: () => set({ cart: [] }),

      cartOpen: false,
      setCartOpen: (open) => set({ cartOpen: open }),

      quickOrderOpen: false,
      setQuickOrderOpen: (open) => set({ quickOrderOpen: open }),

      activeOrderId: null,
      setActiveOrderId: (id) => set({ activeOrderId: id }),

      authMode: null,
      setAuthMode: (mode) => set({ authMode: mode }),
    }),
    {
      name: "hustlecart-kesses",
      storage: createJSONStorage(() => localStorage),
      // Only persist session + cart; view/cartOpen/activeOrderId are runtime.
      partialize: (state) => ({
        session: state.session,
        cart: state.cart,
      }),
    }
  )
);

// Selector helpers
export const selectCartCount = (s: AppState) =>
  s.cart.reduce((sum, c) => sum + c.quantity, 0);

export const selectCartSubtotal = (s: AppState) =>
  s.cart.reduce((sum, c) => sum + c.quantity * c.price, 0);
