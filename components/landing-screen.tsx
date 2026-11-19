"use client";

// LandingScreen — the first thing users see. Two paths:
//   1. "Shop with us" → shopper login flow
//   2. "Operator login" → operator login flow (restricted to the registered phone)
// Also includes a "How it works" section + FAQ for new users.
import { motion } from "framer-motion";
import { ShoppingBag, Store, ArrowRight, Truck, Wallet, ShieldCheck, Search, Package, MessageCircle, ChevronDown } from "lucide-react";
import { BagKMark } from "@/components/logo";
import { useAppStore } from "@/store/use-app-store";
import { useState, useEffect } from "react";

export function LandingScreen() {
  const setAuthMode = useAppStore((s) => s.setAuthMode);

  // Check for ?ref=CODE in the URL → store in localStorage for the signup flow.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("hc_ref_code", ref);
      // Clean the URL so it doesn't show the ref param permanently.
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-soft-orange via-cream to-white">
      {/* Top brand strip */}
      <header className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BagKMark width={36} height={36} />
          <div className="font-extrabold text-navy tracking-tight text-lg">
            Hustle<span className="text-orange-brand">Cart</span>{" "}
            <span className="text-muted-foreground font-semibold text-sm">Kesses</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground hidden sm:block">
          Your local market, delivered.
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-8"
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-brand/15 flex items-center justify-center">
                <BagKMark width={56} height={56} />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-navy tracking-tight">
              HustleCart Kesses
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-md mx-auto">
              We shop for you and deliver to your door. Browse the catalog or send
              a quick order — we&rsquo;ll handle the rest.
            </p>
          </motion.div>

          {/* Two login cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Shopper */}
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              onClick={() => setAuthMode("shopper")}
              className="group bg-card rounded-2xl border-2 border-border hover:border-orange-brand p-6 text-left transition-all hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-brand/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6 text-orange-brand" />
              </div>
              <h2 className="text-lg font-bold text-navy">Shop with us</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Browse products, place orders, and get them delivered to your door.
                Cash on delivery or M-Pesa.
              </p>
              <div className="flex items-center gap-1 text-orange-brand text-sm font-medium mt-3 group-hover:gap-2 transition-all">
                Continue as shopper
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.button>

            {/* Operator */}
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              onClick={() => setAuthMode("operator")}
              className="group bg-navy rounded-2xl border-2 border-navy hover:border-orange-brand p-6 text-left transition-all hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Store className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">Operator login</h2>
              <p className="text-sm text-white/70 mt-1">
                For the HustleCart operator only. Manage catalog, orders, customers,
                and deliveries.
              </p>
              <div className="flex items-center gap-1 text-orange-brand text-sm font-medium mt-3 group-hover:gap-2 transition-all">
                Continue as operator
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-md mx-auto">
            <TrustBadge icon={<Truck className="w-4 h-4" />} text="Same-day delivery" />
            <TrustBadge icon={<Wallet className="w-4 h-4" />} text="M-Pesa & COD" />
            <TrustBadge icon={<ShieldCheck className="w-4 h-4" />} text="Personal shopper" />
          </div>

          {/* How it works */}
          <div className="mt-12">
            <h2 className="text-xl font-bold text-navy text-center mb-6">How it works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <HowItWorksStep
                num={1}
                icon={<Search className="w-5 h-5" />}
                title="Browse or quick order"
                desc="Search the catalog for what you need, or just type your shopping list."
              />
              <HowItWorksStep
                num={2}
                icon={<Package className="w-5 h-5" />}
                title="We shop for you"
                desc="Your HustleCart shopper buys your items from local shops around Kesses."
              />
              <HowItWorksStep
                num={3}
                icon={<Truck className="w-5 h-5" />}
                title="We deliver"
                desc="Your order is delivered to your exact location — track it in real time."
              />
              <HowItWorksStep
                num={4}
                icon={<Wallet className="w-5 h-5" />}
                title="Pay on arrival"
                desc="Pay cash on delivery or M-Pesa STK push. Simple."
              />
            </div>
          </div>

          {/* FAQ */}
          <FAQSection />
        </div>
      </main>
    </div>
  );
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="w-8 h-8 rounded-full bg-orange-brand/10 flex items-center justify-center text-orange-brand">
        {icon}
      </div>
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}

function HowItWorksStep({ num, icon, title, desc }: { num: number; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-orange-brand text-white font-bold flex items-center justify-center mx-auto mb-2 text-sm">
        {num}
      </div>
      <div className="text-orange-brand mb-1 flex justify-center">{icon}</div>
      <h3 className="font-semibold text-sm text-navy">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    { q: "What areas do you deliver to?", a: "We deliver around Kesses, Cheptiret, Tulwet, and Kesses Campus. Delivery fees range from KSh 50 to KSh 120 depending on your area." },
    { q: "How do I pay?", a: "You can pay cash on delivery (pay the shopper when your order arrives) or via M-Pesa STK push at checkout (pay before delivery)." },
    { q: "Can I order something not in the catalog?", a: "Yes! Use the Quick Order button, type your shopping list (e.g., \"2 bread, milk 1L, sugar\"), and we'll WhatsApp you to confirm availability and price." },
    { q: "How long does delivery take?", a: "For ASAP orders, usually within the hour. You can also schedule a delivery time slot (morning, afternoon, or evening) for today or tomorrow." },
    { q: "Do I need to create an account?", a: "Yes, sign up with your phone number. We'll send you an SMS code to verify. It takes less than a minute." },
  ];
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="mt-12">
      <h2 className="text-xl font-bold text-navy text-center mb-6">Frequently asked questions</h2>
      <div className="space-y-2 max-w-lg mx-auto">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-card rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors"
            >
              <span className="text-sm font-medium text-navy">{faq.q}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${openIdx === i ? "rotate-180" : ""}`} />
            </button>
            {openIdx === i && (
              <div className="px-3 pb-3 text-sm text-muted-foreground">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

