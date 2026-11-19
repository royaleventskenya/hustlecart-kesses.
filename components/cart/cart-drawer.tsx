"use client";

// Cart drawer — slide-out Sheet from the right with line items, qty steppers,
// subtotal, delivery fee, total, and a Checkout button.
import { Minus, Plus, Trash2, ShoppingBag, ShoppingCart } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAppStore, selectCartSubtotal } from "@/store/use-app-store";
import { formatKES } from "@/lib/format";
import { CheckoutDialog } from "./checkout-dialog";
import { useState } from "react";

const DELIVERY_FEE_DEFAULT = 80; // shown as "from KSh 80" — actual fee depends on zone

export function CartDrawer() {
  const open = useAppStore((s) => s.cartOpen);
  const setOpen = useAppStore((s) => s.setCartOpen);
  const cart = useAppStore((s) => s.cart);
  const updateQty = useAppStore((s) => s.updateQty);
  const removeFromCart = useAppStore((s) => s.removeFromCart);
  const clearCart = useAppStore((s) => s.clearCart);
  const subtotal = useAppStore(selectCartSubtotal);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const total = subtotal + (cart.length > 0 ? DELIVERY_FEE_DEFAULT : 0);

  // Group items by shop for cleaner display
  const byShop = cart.reduce<Record<string, { shopName: string; items: typeof cart }>>(
    (acc, item) => {
      const key = item.shopName;
      if (!acc[key]) acc[key] = { shopName: item.shopName, items: [] };
      acc[key].items.push(item);
      return acc;
    },
    {}
  );

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col"
        >
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-navy">
              <ShoppingCart className="w-5 h-5 text-orange-brand" />
              Your cart
              {cart.length > 0 && (
                <Badge className="bg-orange-brand text-white">
                  {cart.reduce((s, c) => s + c.quantity, 0)}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Cart contents and checkout.
            </SheetDescription>
          </SheetHeader>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-navy">Your cart is empty</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add products from the shop to get started.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setOpen(false)}
              >
                Continue shopping
              </Button>
            </div>
          ) : (
            <>
              {/* Items (scrollable) */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
                {Object.values(byShop).map((group) => (
                  <div key={group.shopName} className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.shopName}
                    </div>
                    {group.items.map((item) => (
                      <div
                        key={item.productId}
                        className="flex gap-3 items-start bg-muted/40 rounded-lg p-2.5"
                      >
                        {/* Thumb / placeholder */}
                        <div className="w-12 h-12 rounded-md bg-gradient-to-br from-soft-orange to-orange-brand/20 flex items-center justify-center shrink-0 text-orange-brand font-bold">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-navy line-clamp-2">
                            {item.name}
                          </div>
                          <div className="text-sm text-orange-brand font-semibold mt-0.5">
                            {formatKES(item.price)}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex items-center border border-border rounded-md overflow-hidden">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-none"
                                onClick={() => updateQty(item.productId, item.quantity - 1)}
                                aria-label="Decrease"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-7 text-center text-xs font-semibold">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-none"
                                onClick={() => updateQty(item.productId, item.quantity + 1)}
                                aria-label="Increase"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.productId)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1"
                              aria-label="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="font-semibold text-sm text-navy whitespace-nowrap">
                          {formatKES(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                <button
                  onClick={clearCart}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear cart
                </button>
              </div>

              {/* Summary + checkout */}
              <SheetFooter className="border-t border-border p-4 space-y-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="text-navy font-medium">{formatKES(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery (from)</span>
                    <span className="text-navy font-medium">{formatKES(DELIVERY_FEE_DEFAULT)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-navy">Total</span>
                    <span className="text-xl font-extrabold text-orange-brand">
                      {formatKES(total)}
                    </span>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full h-11 bg-orange-brand hover:bg-orange-brand/90"
                  onClick={() => setCheckoutOpen(true)}
                >
                  Checkout · from {formatKES(total)}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </>
  );
}
